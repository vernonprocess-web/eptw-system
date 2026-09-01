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
- ic_wp_no: Identity Card (NRIC), Work Permit, or FIN number (e.g. "G2884785N", "0 64780727", "S9876543A")
- trade: Sector, job title or trade (e.g. "CONSTRUCTION", "Rigging & Lifting", "Electrician", "Scaffolder")

Return ONLY valid JSON matching this schema:
{
  "cert_type": "string",
  "cert_no": "string",
  "issuer": "string",
  "issued_date": "YYYY-MM-DD",
  "cert_expiry": "YYYY-MM-DD",
  "name": "string",
  "ic_wp_no": "string",
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
          ic_wp_no: extracted.ic_wp_no || '',
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

    // 1. If target worker ID is not provided, create a new Worker Profile
    if (!target_worker_id) {
      if (!name || !ic_wp_no) {
        return c.json({ success: false, error: 'Name and IC/WP No are required for new worker.' }, 400);
      }

      if (!finalWorkerId) {
        finalWorkerId = `WRK-${Math.floor(1000 + Math.random() * 9000)}`;
      }

      // Check if worker profile already exists
      const existingWorker = await c.env.DB.prepare(
        'SELECT worker_id FROM Worker_Registry WHERE worker_id = ? OR ic_wp_no = ?'
      ).bind(finalWorkerId, ic_wp_no).first();

      if (!existingWorker) {
        await c.env.DB.prepare(
          `INSERT INTO Worker_Registry (worker_id, name, ic_wp_no, trade)
           VALUES (?, ?, ?, ?)`
        ).bind(finalWorkerId, name, ic_wp_no, trade || 'General Worker').run();
      } else {
        finalWorkerId = String(existingWorker.worker_id);
      }
    } else {
      // If attaching to existing worker, optionally update trade/name if missing
      if (trade || name) {
        await c.env.DB.prepare(
          `UPDATE Worker_Registry 
           SET name = COALESCE(NULLIF(?, ''), name), trade = COALESCE(NULLIF(?, ''), trade)
           WHERE worker_id = ?`
        ).bind(name || '', trade || '', target_worker_id).run();
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
    const { name, ic_wp_no, trade } = body;

    if (!name || !ic_wp_no || !trade) {
      return c.json(
        { success: false, error: 'Name, IC/WP No, and Trade are required.' },
        400
      );
    }

    const result = await c.env.DB.prepare(
      `UPDATE Worker_Registry 
       SET name = ?, ic_wp_no = ?, trade = ?
       WHERE worker_id = ?`
    )
      .bind(name, ic_wp_no, trade, id)
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

// Serve static assets from public folder
app.use('/*', serveStatic({ root: './' }));

export default app;
