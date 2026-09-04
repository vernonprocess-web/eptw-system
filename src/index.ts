import { Hono } from 'hono';
import { serveStatic } from 'hono/cloudflare-workers';

type Bindings = {
  DB: D1Database;
  CERT_BUCKET: R2Bucket;
  GEMINI_API_KEY?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// ============================================================================
// GEMINI VISION OCR HELPER
// ============================================================================
async function extractWorkerDataWithGemini(
  arrayBuffer: ArrayBuffer,
  mimeType: string,
  apiKey: string
) {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64Data = btoa(binary);

  const promptText = `Analyze this image of a Worker Identification Card, Work Permit, FIN card, NRIC, WSQ Certificate, SOC Safety Certificate, or Training Card in Singapore.
Extract the following information strictly as valid JSON:
- cert_type: Official title/type of document (e.g. "Work Permit", "WSQ Supervise Safe Lifting Operation", "SOC Safety Course", "Work at Height Supervisor")
- cert_no: Certificate, student, or permit registration number (e.g. "LS-MF-COM-306E-1-00072", "0 64780727", "G2884785N")
- issuer: Issuing academy/institution or ministry (e.g. "Wong Fong Academy", "MOM Singapore", "WSH Council")
- issued_date: Certificate issue date strictly in YYYY-MM-DD format (e.g. "2023-01-25" if 25/01/2023)
- cert_expiry: Certificate expiration date strictly in YYYY-MM-DD format (if applicable, otherwise empty string)
- name: Full name of the worker (e.g. "BABU MD NAIM")
- ic_no: Singapore NRIC / Identity Card number ONLY (starts with S or T, e.g. "S9876543A"). If document is not an NRIC, return empty string "".
- wp_no: Singapore Work Permit number ONLY (e.g. "0 64780727"). If document is not a Work Permit, return empty string "".
- fin_no: Singapore FIN (Foreign Identification Number) ONLY (starts with F, G, or M, e.g. "G2884785N"). If document is not a FIN card, return empty string "".
- trade: Sector, job title or trade (e.g. "CONSTRUCTION", "Rigging & Lifting", "Electrician", "Scaffolder")

Return ONLY valid JSON matching this schema:
{
  "cert_type": "string",
  "cert_no": "string",
  "issuer": "string",
  "issued_date": "YYYY-MM-DD",
  "cert_expiry": "YYYY-MM-DD",
  "name": "string",
  "ic_no": "string",
  "wp_no": "string",
  "fin_no": "string",
  "trade": "string"
}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: promptText },
              {
                inlineData: {
                  mimeType: mimeType || 'image/jpeg',
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errText}`);
  }

  const resData = (await response.json()) as any;
  const candidate = resData.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!candidate) {
    throw new Error('Gemini API returned empty response');
  }

  try {
    return JSON.parse(candidate);
  } catch (e) {
    const cleaned = candidate.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  }
}

// ============================================================================
// RAMS ROUTES
// ============================================================================

// GET /api/rams - Fetch all RAMS entries from database
app.get('/api/rams', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM Master_RAMS_Library ORDER BY id DESC'
    ).all();
    return c.json({ success: true, data: results });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /api/rams - Insert a new RAMS entry
app.post('/api/rams', async (c) => {
  try {
    const body = await c.req.json();
    const {
      activity_category,
      work_activity,
      hazard,
      possible_accident,
      control_measures,
      severity_s,
      likelihood_l,
    } = body;

    if (
      !activity_category ||
      !work_activity ||
      !hazard ||
      !possible_accident ||
      !control_measures ||
      severity_s === undefined ||
      likelihood_l === undefined
    ) {
      return c.json(
        { success: false, error: 'All fields are required.' },
        400
      );
    }

    const s = parseInt(severity_s, 10);
    const l = parseInt(likelihood_l, 10);

    if (isNaN(s) || isNaN(l) || s < 1 || s > 5 || l < 1 || l > 5) {
      return c.json(
        { success: false, error: 'Severity and Likelihood must be integers between 1 and 5.' },
        400
      );
    }

    const rpn = body.rpn !== undefined ? parseInt(body.rpn, 10) : s * l;

    const result = await c.env.DB.prepare(
      `INSERT INTO Master_RAMS_Library 
      (activity_category, work_activity, hazard, possible_accident, control_measures, severity_s, likelihood_l, rpn)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        activity_category,
        work_activity,
        hazard,
        possible_accident,
        control_measures,
        s,
        l,
        rpn
      )
      .run();

    return c.json(
      {
        success: true,
        message: 'RAMS record created successfully',
        id: result.meta.last_row_id,
      },
      201
    );
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// PUT /api/rams/:id - Update an existing RAMS entry by ID
app.put('/api/rams/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();

    const {
      activity_category,
      work_activity,
      hazard,
      possible_accident,
      control_measures,
      severity_s,
      likelihood_l,
    } = body;

    if (
      !activity_category ||
      !work_activity ||
      !hazard ||
      !possible_accident ||
      !control_measures ||
      severity_s === undefined ||
      likelihood_l === undefined
    ) {
      return c.json(
        { success: false, error: 'All fields are required.' },
        400
      );
    }

    const s = parseInt(severity_s, 10);
    const l = parseInt(likelihood_l, 10);

    if (isNaN(s) || isNaN(l) || s < 1 || s > 5 || l < 1 || l > 5) {
      return c.json(
        { success: false, error: 'Severity and Likelihood must be integers between 1 and 5.' },
        400
      );
    }

    const rpn = body.rpn !== undefined ? parseInt(body.rpn, 10) : s * l;

    const result = await c.env.DB.prepare(
      `UPDATE Master_RAMS_Library 
       SET activity_category = ?, work_activity = ?, hazard = ?, possible_accident = ?, control_measures = ?, severity_s = ?, likelihood_l = ?, rpn = ?
       WHERE id = ?`
    )
      .bind(
        activity_category,
        work_activity,
        hazard,
        possible_accident,
        control_measures,
        s,
        l,
        rpn,
        id
      )
      .run();

    if (result.meta.changes === 0) {
      return c.json({ success: false, error: 'RAMS record not found.' }, 404);
    }

    return c.json({ success: true, message: 'RAMS record updated successfully.' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// DELETE /api/rams/:id - Delete a RAMS entry by ID
app.delete('/api/rams/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const result = await c.env.DB.prepare(
      'DELETE FROM Master_RAMS_Library WHERE id = ?'
    )
      .bind(id)
      .run();

    if (result.meta.changes === 0) {
      return c.json({ success: false, error: 'RAMS record not found.' }, 404);
    }

    return c.json({ success: true, message: 'RAMS record deleted successfully.' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================================================
// WORKER REGISTRY ROUTES & MULTI-CERTIFICATE SUPPORT
// ============================================================================

// GET /api/certs/:key - Serve uploaded certs from R2
app.get('/api/certs/:key{.+}', async (c) => {
  try {
    const key = c.req.param('key');
    if (!c.env.CERT_BUCKET) {
      return c.text('R2 CERT_BUCKET is not bound.', 500);
    }
    const object = await c.env.CERT_BUCKET.get(key);
    if (!object) {
      return c.text('Certificate file not found.', 404);
    }
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    return new Response(object.body, { headers });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /api/workers - Fetch all workers with their associated certificates
app.get('/api/workers', async (c) => {
  try {
    const { results: workers } = await c.env.DB.prepare(
      'SELECT * FROM Worker_Registry ORDER BY name ASC'
    ).all();

    const { results: certs } = await c.env.DB.prepare(
      'SELECT * FROM Worker_Certificates ORDER BY cert_id ASC'
    ).all();

    // Map certificates to respective worker profiles
    const certsByWorkerId: Record<string, any[]> = {};
    for (const cert of certs) {
      const wId = String(cert.worker_id);
      if (!certsByWorkerId[wId]) {
        certsByWorkerId[wId] = [];
      }
      certsByWorkerId[wId].push(cert);
    }

    const fullWorkerData = workers.map((w: any) => ({
      ...w,
      certificates: certsByWorkerId[w.worker_id] || [],
    }));

    return c.json({ success: true, data: fullWorkerData });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /api/workers/upload - Handle file upload, save to R2, & run Gemini Vision OCR
app.post('/api/workers/upload', async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body['file'];

    if (!file || typeof file === 'string') {
      return c.json({ success: false, error: 'No file uploaded.' }, 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileName = file.name || 'document.jpg';
    const fileExtension = fileName.split('.').pop() || 'jpg';
    const key = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExtension}`;

    // Upload raw file to Cloudflare R2 CERT_BUCKET
    if (c.env.CERT_BUCKET) {
      await c.env.CERT_BUCKET.put(key, arrayBuffer, {
        httpMetadata: { contentType: file.type || 'image/jpeg' },
      });
    }

    const certFileUrl = `/api/certs/${key}`;

    let ocrData = {
      cert_type: 'Certificate',
      cert_no: '',
      issuer: '',
      issued_date: '',
      cert_expiry: '',
      name: '',
      ic_no: '',
      wp_no: '',
      fin_no: '',
      ic_wp_no: '',
      trade: '',
    };

    const apiKey = c.env.GEMINI_API_KEY || c.req.header('x-gemini-api-key');
    if (apiKey) {
      try {
        const extracted = await extractWorkerDataWithGemini(
          arrayBuffer,
          file.type || 'image/jpeg',
          apiKey
        );
        ocrData = {
          cert_type: extracted.cert_type || 'Certificate',
          cert_no: extracted.cert_no || '',
          issuer: extracted.issuer || '',
          issued_date: extracted.issued_date || '',
          cert_expiry: extracted.cert_expiry || '',
          name: extracted.name || '',
          ic_no: extracted.ic_no || '',
          wp_no: extracted.wp_no || '',
          fin_no: extracted.fin_no || '',
          ic_wp_no: extracted.ic_no || extracted.wp_no || extracted.fin_no || extracted.ic_wp_no || '',
          trade: extracted.trade || '',
        };
      } catch (ocrErr: any) {
        console.error('Gemini OCR extraction error:', ocrErr);
      }
    }

    return c.json({
      success: true,
      cert_file_url: certFileUrl,
      ocr: ocrData,
      hasKey: !!apiKey
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /api/workers - Create new worker OR attach certificate to existing worker
app.post('/api/workers', async (c) => {
  try {
    const body = await c.req.json();
    const {
      target_worker_id, // If attaching cert to existing worker
      worker_id,        // If creating new worker
      name,
      ic_no,
      wp_no,
      fin_no,
      ic_wp_no,
      trade,
      cert_type,
      cert_no,
      issuer,
      issued_date,
      cert_expiry,
      cert_valid,
      cert_file_url,
    } = body;

    let finalWorkerId = target_worker_id || worker_id;
    const finalIcNo = ic_no || '';
    const finalWpNo = wp_no || '';
    const finalFinNo = fin_no || '';
    const combinedIcWp = ic_wp_no || finalIcNo || finalWpNo || finalFinNo || '';

    // 1. If target worker ID is not provided, create a new Worker Profile
    if (!target_worker_id) {
      if (!name) {
        return c.json({ success: false, error: 'Full name is required for new worker.' }, 400);
      }

      if (!finalWorkerId) {
        finalWorkerId = `WRK-${Math.floor(1000 + Math.random() * 9000)}`;
      }

      // Check if worker profile already exists by worker_id, IC, WP, or FIN
      const existingWorker = await c.env.DB.prepare(
        `SELECT worker_id FROM Worker_Registry 
         WHERE worker_id = ? 
            OR (ic_no != '' AND ic_no = ?)
            OR (wp_no != '' AND wp_no = ?)
            OR (fin_no != '' AND fin_no = ?)`
      ).bind(finalWorkerId, finalIcNo, finalWpNo, finalFinNo).first();

      if (!existingWorker) {
        await c.env.DB.prepare(
          `INSERT INTO Worker_Registry (worker_id, name, ic_no, wp_no, fin_no, ic_wp_no, trade)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(finalWorkerId, name, finalIcNo, finalWpNo, finalFinNo, combinedIcWp, trade || 'General Worker').run();
      } else {
        finalWorkerId = String(existingWorker.worker_id);
      }
    } else {
      // If attaching to existing worker, update profile details if provided
      if (trade || name || finalIcNo || finalWpNo || finalFinNo) {
        await c.env.DB.prepare(
          `UPDATE Worker_Registry 
           SET name = COALESCE(NULLIF(?, ''), name),
               ic_no = COALESCE(NULLIF(?, ''), ic_no),
               wp_no = COALESCE(NULLIF(?, ''), wp_no),
               fin_no = COALESCE(NULLIF(?, ''), fin_no),
               trade = COALESCE(NULLIF(?, ''), trade)
           WHERE worker_id = ?`
        ).bind(name || '', finalIcNo, finalWpNo, finalFinNo, trade || '', target_worker_id).run();
      }
    }

    // 2. Compute Certificate Validity
    let isValid = 1;
    if (cert_expiry) {
      const today = new Date().toISOString().split('T')[0];
      isValid = cert_expiry >= today ? 1 : 0;
    } else if (cert_valid !== undefined) {
      isValid = cert_valid ? 1 : 0;
    }

    // 3. Insert Certificate into Worker_Certificates
    const certTypeFinal = cert_type || 'General Certificate';
    const certResult = await c.env.DB.prepare(
      `INSERT INTO Worker_Certificates 
      (worker_id, cert_type, cert_no, issuer, issued_date, cert_expiry, cert_valid, cert_file_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        finalWorkerId,
        certTypeFinal,
        cert_no || null,
        issuer || null,
        issued_date || null,
        cert_expiry || null,
        isValid,
        cert_file_url || ''
      )
      .run();

    return c.json(
      {
        success: true,
        message: 'Certificate saved successfully',
        worker_id: finalWorkerId,
        cert_id: certResult.meta.last_row_id,
      },
      201
    );
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// PUT /api/workers/:id - Update worker profile details
app.put('/api/workers/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { name, ic_no, wp_no, fin_no, trade } = body;

    if (!name || !trade) {
      return c.json(
        { success: false, error: 'Name and Trade are required.' },
        400
      );
    }

    const result = await c.env.DB.prepare(
      `UPDATE Worker_Registry 
       SET name = ?, ic_no = ?, wp_no = ?, fin_no = ?, trade = ?
       WHERE worker_id = ?`
    )
      .bind(name, ic_no || '', wp_no || '', fin_no || '', trade, id)
      .run();

    if (result.meta.changes === 0) {
      return c.json({ success: false, error: 'Worker record not found.' }, 404);
    }

    return c.json({ success: true, message: 'Worker profile updated successfully.' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// DELETE /api/certs/:cert_id - Delete a single certificate
app.delete('/api/certs/:cert_id', async (c) => {
  try {
    const certId = c.req.param('cert_id');
    const result = await c.env.DB.prepare(
      'DELETE FROM Worker_Certificates WHERE cert_id = ?'
    ).bind(certId).run();

    if (result.meta.changes === 0) {
      return c.json({ success: false, error: 'Certificate record not found.' }, 404);
    }

    return c.json({ success: true, message: 'Certificate deleted successfully.' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// DELETE /api/workers/:id - Delete worker profile and all certificates
app.delete('/api/workers/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM Worker_Certificates WHERE worker_id = ?').bind(id).run();
    const result = await c.env.DB.prepare('DELETE FROM Worker_Registry WHERE worker_id = ?').bind(id).run();

    if (result.meta.changes === 0) {
      return c.json({ success: false, error: 'Worker record not found.' }, 404);
    }

    return c.json({ success: true, message: 'Worker profile and all associated certificates deleted.' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================================================
// PROJECT DIRECTORY ROUTES & CONTROL CENTER API
// ============================================================================

// GET /api/projects - List all projects
app.get('/api/projects', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM Project_Directory ORDER BY created_at DESC'
    ).all();
    return c.json({ success: true, data: results });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /api/projects - Register a new project site
app.post('/api/projects', async (c) => {
  try {
    const body = await c.req.json();
    let { project_id, project_name, client_name, location, project_manager, status, start_date, wsho_name, wsho_email, wsho_phone, pm_email } = body;

    if (!project_name || !location) {
      return c.json({ success: false, error: 'Project Name and Location are required.' }, 400);
    }

    if (!project_id || !project_id.trim()) {
      project_id = `PRJ-${Math.floor(100 + Math.random() * 900)}`;
    }

    const existing = await c.env.DB.prepare(
      'SELECT project_id FROM Project_Directory WHERE project_id = ?'
    ).bind(project_id).first();

    if (existing) {
      return c.json({ success: false, error: `Project ID ${project_id} already exists.` }, 400);
    }

    await c.env.DB.prepare(
      `INSERT INTO Project_Directory (project_id, project_name, client_name, location, project_manager, status, start_date, wsho_name, wsho_email, wsho_phone, pm_email)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      project_id,
      project_name,
      client_name || '',
      location,
      project_manager || 'TBD',
      status || 'Active',
      start_date || new Date().toISOString().split('T')[0],
      wsho_name || '',
      wsho_email || '',
      wsho_phone || '',
      pm_email || ''
    ).run();

    return c.json({
      success: true,
      message: 'Project created successfully.',
      project_id
    }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// PUT /api/projects/:id - Update an existing project
app.put('/api/projects/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { project_name, client_name, location, project_manager, status, start_date, wsho_name, wsho_email, wsho_phone, pm_email } = body;

    if (!project_name || !location) {
      return c.json({ success: false, error: 'Project Name and Location are required.' }, 400);
    }

    const result = await c.env.DB.prepare(
      `UPDATE Project_Directory 
       SET project_name = ?, client_name = ?, location = ?, project_manager = ?, status = ?, start_date = ?,
           wsho_name = ?, wsho_email = ?, wsho_phone = ?, pm_email = ?
       WHERE project_id = ?`
    ).bind(
      project_name,
      client_name || '',
      location,
      project_manager || 'TBD',
      status || 'Active',
      start_date || new Date().toISOString().split('T')[0],
      wsho_name || '',
      wsho_email || '',
      wsho_phone || '',
      pm_email || '',
      id
    ).run();

    if (result.meta.changes === 0) {
      return c.json({ success: false, error: 'Project record not found.' }, 404);
    }

    return c.json({ success: true, message: 'Project updated successfully.' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// DELETE /api/projects/:id - Remove a project
app.delete('/api/projects/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const result = await c.env.DB.prepare(
      'DELETE FROM Project_Directory WHERE project_id = ?'
    ).bind(id).run();

    if (result.meta.changes === 0) {
      return c.json({ success: false, error: 'Project record not found.' }, 404);
    }

    return c.json({ success: true, message: 'Project deleted successfully.' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /api/projects/:id/dashboard - Project Control Center KPI Endpoint
app.get('/api/projects/:id/dashboard', async (c) => {
  try {
    const id = c.req.param('id');
    const project = await c.env.DB.prepare(
      'SELECT * FROM Project_Directory WHERE project_id = ?'
    ).bind(id).first();

    if (!project) {
      return c.json({ success: false, error: 'Project not found.' }, 404);
    }

    // Dynamic / Mock KPI metrics for Project Control Center
    const isTuas = id === 'PRJ-002';
    const isUpcoming = project.status === 'Upcoming';

    const kpiData = {
      project,
      kpis: {
        active_ptws: isUpcoming ? 0 : (isTuas ? 6 : 4),
        workers_on_site: isUpcoming ? 0 : (isTuas ? 18 : 12),
        days_without_incident: isUpcoming ? 0 : (isTuas ? 88 : 45),
        wsh_compliance_score: isUpcoming ? '100%' : '98.5%',
        high_risk_activities: isUpcoming ? 0 : (isTuas ? 4 : 2),
        pending_permits: isUpcoming ? 1 : 2
      }
    };

    return c.json({ success: true, data: kpiData });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /api/projects/provisional - Provisional Site Bypass Endpoint
app.post('/api/projects/provisional', async (c) => {
  try {
    const body = await c.req.json();
    const { project_name, location, client_name, project_manager, wsho_name, wsho_email, wsho_phone, pm_email } = body;

    if (!project_name || !location) {
      return c.json({ success: false, error: 'Site Name and Address/Location are required.' }, 400);
    }

    const project_id = `PRJ-PROV-${Math.floor(100 + Math.random() * 900)}`;
    const todayStr = new Date().toISOString().split('T')[0];

    await c.env.DB.prepare(
      `INSERT INTO Project_Directory (project_id, project_name, client_name, location, project_manager, status, start_date, wsho_name, wsho_email, wsho_phone, pm_email)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      project_id,
      project_name,
      client_name || 'Provisional Client',
      location,
      project_manager || 'Site Supervisor',
      'Provisional',
      todayStr,
      wsho_name || '',
      wsho_email || '',
      wsho_phone || '',
      pm_email || ''
    ).run();

    return c.json({
      success: true,
      message: 'Provisional site registered successfully.',
      project_id,
      project_name
    }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================================================================
// ePTW TRANSACTION ENGINE ROUTES (PHASE 1 & PHASE 2 WORKFLOW)
// ============================================================================

// GET /api/ptw - Fetch all permits joined with Project details & Safety Officers
app.get('/api/ptw', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT p.*, 
              prj.project_name, prj.location, prj.client_name,
              prj.wsho_name, prj.wsho_email, prj.wsho_phone, prj.pm_email, prj.project_manager
       FROM PTW_Records p
       LEFT JOIN Project_Directory prj ON p.project_id = prj.project_id
       ORDER BY p.created_at DESC`
    ).all();
    return c.json({ success: true, data: results });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /api/ptw - Create a new permit to work with digital applicant signature
app.post('/api/ptw', async (c) => {
  try {
    const body = await c.req.json();
    const {
      project_id,
      ptw_type,
      work_description,
      assigned_workers_json,
      selected_rams_json,
      status,
      valid_until,
      applicant_signature
    } = body;

    if (!project_id || !work_description) {
      return c.json({ success: false, error: 'Project Site and Work Description are required.' }, 400);
    }

    let { ptw_id } = body;
    if (!ptw_id || !ptw_id.trim()) {
      ptw_id = `PTW-2026-${Math.floor(100 + Math.random() * 900)}`;
    }

    const defaultExpiry = new Date();
    defaultExpiry.setHours(18, 0, 0, 0); // Default to 6:00 PM today
    const expiryStr = valid_until || defaultExpiry.toISOString().replace('T', ' ').substring(0, 19);

    const workersJsonStr = typeof assigned_workers_json === 'string' 
      ? assigned_workers_json 
      : JSON.stringify(assigned_workers_json || []);

    const ramsJsonStr = typeof selected_rams_json === 'string' 
      ? selected_rams_json 
      : JSON.stringify(selected_rams_json || []);

    const initialStatus = status || 'Pending Safety Vetting';

    await c.env.DB.prepare(
      `INSERT INTO PTW_Records (
        ptw_id, project_id, ptw_type, work_description, 
        assigned_workers_json, selected_rams_json, status, valid_until,
        applicant_signature
      )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      ptw_id,
      project_id,
      ptw_type || 'Work at Height',
      work_description,
      workersJsonStr,
      ramsJsonStr,
      initialStatus,
      expiryStr,
      applicant_signature || null
    ).run();

    return c.json({
      success: true,
      message: `Permit ${ptw_id} created successfully with status '${initialStatus}'.`,
      ptw_id
    }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// PUT /api/ptw/:id - Update permit details or workflow signatures
app.put('/api/ptw/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const {
      project_id,
      ptw_type,
      work_description,
      assigned_workers_json,
      selected_rams_json,
      status,
      valid_until,
      applicant_signature,
      safety_signature,
      pm_signature,
      rejection_reason
    } = body;

    const existing = await c.env.DB.prepare('SELECT * FROM PTW_Records WHERE ptw_id = ?').bind(id).first();
    if (!existing) {
      return c.json({ success: false, error: 'Permit record not found.' }, 404);
    }

    const updatedProjectId = project_id || existing.project_id;
    const updatedType = ptw_type || existing.ptw_type;
    const updatedDesc = work_description || existing.work_description;

    const updatedWorkers = assigned_workers_json !== undefined
      ? (typeof assigned_workers_json === 'string' ? assigned_workers_json : JSON.stringify(assigned_workers_json))
      : existing.assigned_workers_json;

    const updatedRams = selected_rams_json !== undefined
      ? (typeof selected_rams_json === 'string' ? selected_rams_json : JSON.stringify(selected_rams_json))
      : existing.selected_rams_json;

    const updatedStatus = status || existing.status;
    const updatedExpiry = valid_until || existing.valid_until;
    const updatedApplicantSig = applicant_signature !== undefined ? applicant_signature : existing.applicant_signature;
    const updatedSafetySig = safety_signature !== undefined ? safety_signature : existing.safety_signature;
    const updatedPmSig = pm_signature !== undefined ? pm_signature : existing.pm_signature;
    const updatedRejection = rejection_reason !== undefined ? rejection_reason : existing.rejection_reason;

    let safetyVettedAt = existing.safety_vetted_at;
    let pmApprovedAt = existing.pm_approved_at;
    let closedAt = existing.closed_at;

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    if (status === 'Pending PM Approval' && !existing.safety_vetted_at) {
      safetyVettedAt = nowStr;
    }
    if (status === 'Active' && !existing.pm_approved_at) {
      pmApprovedAt = nowStr;
    }
    if (status === 'Closed' && !existing.closed_at) {
      closedAt = nowStr;
    }

    await c.env.DB.prepare(
      `UPDATE PTW_Records 
       SET project_id = ?, ptw_type = ?, work_description = ?, assigned_workers_json = ?, selected_rams_json = ?,
           status = ?, valid_until = ?, applicant_signature = ?, safety_signature = ?, pm_signature = ?,
           safety_vetted_at = ?, pm_approved_at = ?, closed_at = ?, rejection_reason = ?
       WHERE ptw_id = ?`
    ).bind(
      updatedProjectId,
      updatedType,
      updatedDesc,
      updatedWorkers,
      updatedRams,
      updatedStatus,
      updatedExpiry,
      updatedApplicantSig,
      updatedSafetySig,
      updatedPmSig,
      safetyVettedAt,
      pmApprovedAt,
      closedAt,
      updatedRejection,
      id
    ).run();

    return c.json({ success: true, message: `Permit ${id} updated successfully.` });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// DELETE /api/ptw/:id - Delete a permit
app.delete('/api/ptw/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const result = await c.env.DB.prepare('DELETE FROM PTW_Records WHERE ptw_id = ?').bind(id).run();

    if (result.meta.changes === 0) {
      return c.json({ success: false, error: 'Permit record not found.' }, 404);
    }

    return c.json({ success: true, message: 'Permit deleted successfully.' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Serve static assets from public folder
app.use('/*', serveStatic({ root: './' }));

export default app;


