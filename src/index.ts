import { Hono } from 'hono';
import { serveStatic } from 'hono/cloudflare-workers';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

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

    // Auto-calculate RPN (severity_s * likelihood_l) if not explicitly provided
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

    // Auto-calculate RPN if omitted
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

// Serve static assets from public folder
app.use('/*', serveStatic({ root: './' }));

export default app;
