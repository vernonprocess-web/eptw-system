// src/notifications.ts - Phase 4 Notification Engine (Resend Email + Telegram Bot)

export interface NotificationEnv {
    RESEND_API_KEY?: string;
    TELEGRAM_BOT_TOKEN?: string;
    TELEGRAM_BOT_USERNAME?: string;
    APP_URL?: string;
}

export interface PTWRecordForNotification {
    id: string;
    ptw_number: string;
    project_name: string;
    work_description?: string;
    applicant_name?: string;
    applicant_email?: string;
    assigned_wsho_name?: string;
    assigned_wsho_email?: string;
    status: string;
    rejection_reason?: string;
}

/**
 * Encodes an email address into a Telegram-compliant Base64URL token ([a-zA-Z0-9_-])
 */
export function encodeTelegramToken(email: string): string {
    const base64 = btoa(email.trim().toLowerCase());
    return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/**
 * Decodes a Telegram Base64URL token back to an email address
 */
export function decodeTelegramToken(token: string): string {
    let base64 = token.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
        base64 += '=';
    }
    return atob(base64);
}

/**
 * Sends an email using the Resend API (HTTP REST)
 */
export async function sendResendEmail(params: {
    to: string;
    subject: string;
    htmlContent: string;
    apiKey?: string;
}): Promise<{ success: boolean; error?: string }> {
    const apiKey = params.apiKey;
    if (!apiKey) {
        console.warn(`[Resend Mock] Skipping email to ${params.to} (RESEND_API_KEY missing)`);
        return { success: true };
    }

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'Unified ePTW System <onboarding@resend.dev>',
                to: [params.to],
                subject: params.subject,
                html: params.htmlContent
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`[Resend API Error] Status ${response.status}: ${errText}`);
            return { success: false, error: errText };
        }

        const data = await response.json();
        console.log(`[Resend Email Sent] ID: ${(data as any).id} to ${params.to}`);
        return { success: true };
    } catch (err: any) {
        console.error(`[Resend Fetch Exception]`, err);
        return { success: false, error: err.message };
    }
}

/**
 * Sends an HTML-formatted Telegram message via Bot API
 */
export async function sendTelegramMessage(params: {
    chatId: string;
    htmlMessage: string;
    botToken?: string;
}): Promise<{ success: boolean; error?: string }> {
    const botToken = params.botToken;
    if (!botToken || !params.chatId) {
        console.warn(`[Telegram Mock] Skipping message to ChatID ${params.chatId} (TELEGRAM_BOT_TOKEN missing)`);
        return { success: true };
    }

    try {
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chat_id: params.chatId,
                text: params.htmlMessage,
                parse_mode: 'HTML',
                disable_web_page_preview: false
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`[Telegram API Error] Status ${response.status}: ${errText}`);
            return { success: false, error: errText };
        }

        console.log(`[Telegram Message Sent] ChatID: ${params.chatId}`);
        return { success: true };
    } catch (err: any) {
        console.error(`[Telegram Fetch Exception]`, err);
        return { success: false, error: err.message };
    }
}

/**
 * Looks up Telegram Chat ID by email address in D1 Telegram_Users table
 */
export async function getTelegramChatIdByEmail(db: D1Database, email: string): Promise<string | null> {
    if (!email) return null;
    try {
        const row = await db.prepare("SELECT telegram_chat_id FROM Telegram_Users WHERE LOWER(email) = LOWER(?)").bind(email.trim()).first<{ telegram_chat_id: string }>();
        return row ? row.telegram_chat_id : null;
    } catch (err) {
        console.error("[Telegram DB Lookup Error]", err);
        return null;
    }
}

/**
 * Main Fault-Tolerant Permit Notification Dispatcher
 */
export async function dispatchPermitNotification(
    env: NotificationEnv,
    db: D1Database,
    ptw: PTWRecordForNotification,
    eventType: 'PERMIT_SUBMITTED' | 'PERMIT_VETTED' | 'PERMIT_APPROVED' | 'PERMIT_REJECTED'
): Promise<void> {
    const appUrl = env.APP_URL || 'http://localhost:8787';
    const permitLink = `${appUrl}/?ptw=${encodeURIComponent(ptw.ptw_number)}`;

    let subject = '';
    let emailHtml = '';
    let telegramHtml = '';
    const recipients: Array<{ email?: string; name?: string; role: string }> = [];

    if (eventType === 'PERMIT_SUBMITTED') {
        subject = `⚠️ [ePTW] Safety Vetting Required: ${ptw.ptw_number}`;
        if (ptw.assigned_wsho_email) {
            recipients.push({ email: ptw.assigned_wsho_email, name: ptw.assigned_wsho_name, role: 'WSHO' });
        }

        emailHtml = `
            <h2>Action Required: Safety Vetting</h2>
            <p>A new Permit to Work has been submitted and requires your safety review.</p>
            <ul>
                <li><b>Permit No:</b> ${ptw.ptw_number}</li>
                <li><b>Project:</b> ${ptw.project_name}</li>
                <li><b>Applicant:</b> ${ptw.applicant_name || 'Site Supervisor'}</li>
                <li><b>Description:</b> ${ptw.work_description || 'N/A'}</li>
            </ul>
            <p><a href="${permitLink}" style="background:#0284c7;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block;">Open & Sign Permit</a></p>
        `;

        telegramHtml = `
<b>⚠️ Action Required: Safety Vetting</b>
<b>Permit:</b> ${ptw.ptw_number}
<b>Project:</b> ${ptw.project_name}
<b>Applicant:</b> ${ptw.applicant_name || 'Site Supervisor'}
<b>Work:</b> ${ptw.work_description || 'N/A'}

👉 <a href="${permitLink}">Open & Sign Permit</a>
        `.trim();
    } else if (eventType === 'PERMIT_VETTED') {
        subject = `📋 [ePTW] PM Authorization Required: ${ptw.ptw_number}`;
        // PM notification
        if (ptw.assigned_wsho_email) {
            recipients.push({ email: ptw.assigned_wsho_email, name: 'Project Manager', role: 'PM' });
        }

        emailHtml = `
            <h2>Action Required: Project Manager Authorization</h2>
            <p>Safety Assessor / WSHO has vetted permit <b>${ptw.ptw_number}</b>. Your final approval is pending.</p>
            <ul>
                <li><b>Permit No:</b> ${ptw.ptw_number}</li>
                <li><b>Project:</b> ${ptw.project_name}</li>
                <li><b>WSHO Assessor:</b> ${ptw.assigned_wsho_name || 'WSHO'}</li>
            </ul>
            <p><a href="${permitLink}" style="background:#16a34a;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block;">Authorize Permit</a></p>
        `;

        telegramHtml = `
<b>📋 Action Required: PM Authorization</b>
<b>Permit:</b> ${ptw.ptw_number}
<b>Project:</b> ${ptw.project_name}
<b>Vetted By:</b> ${ptw.assigned_wsho_name || 'WSHO Assessor'}

👉 <a href="${permitLink}">Authorize Permit</a>
        `.trim();
    } else if (eventType === 'PERMIT_APPROVED') {
        subject = `✅ [ePTW] Permit APPROVED: ${ptw.ptw_number}`;
        if (ptw.applicant_email) recipients.push({ email: ptw.applicant_email, name: ptw.applicant_name, role: 'Applicant' });
        if (ptw.assigned_wsho_email) recipients.push({ email: ptw.assigned_wsho_email, name: ptw.assigned_wsho_name, role: 'WSHO' });

        emailHtml = `
            <h2>Permit Status: ACTIVE & APPROVED</h2>
            <p>Permit <b>${ptw.ptw_number}</b> has been authorized by Project Manager. High-risk work may safely commence.</p>
            <ul>
                <li><b>Permit No:</b> ${ptw.ptw_number}</li>
                <li><b>Project:</b> ${ptw.project_name}</li>
                <li><b>Status:</b> ACTIVE</li>
            </ul>
            <p><a href="${permitLink}" style="background:#16a34a;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block;">View Approved Permit</a></p>
        `;

        telegramHtml = `
<b>✅ Permit APPROVED & ACTIVE</b>
<b>Permit:</b> ${ptw.ptw_number}
<b>Project:</b> ${ptw.project_name}
<b>Status:</b> ACTIVE (Work may commence)

👉 <a href="${permitLink}">View Approved Permit</a>
        `.trim();
    } else if (eventType === 'PERMIT_REJECTED') {
        subject = `❌ [ePTW] Permit REJECTED: ${ptw.ptw_number}`;
        if (ptw.applicant_email) recipients.push({ email: ptw.applicant_email, name: ptw.applicant_name, role: 'Applicant' });

        emailHtml = `
            <h2>Permit Status: REJECTED</h2>
            <p>Permit <b>${ptw.ptw_number}</b> was rejected.</p>
            <ul>
                <li><b>Permit No:</b> ${ptw.ptw_number}</li>
                <li><b>Project:</b> ${ptw.project_name}</li>
                <li><b>Reason:</b> ${ptw.rejection_reason || 'Safety criteria not met'}</li>
            </ul>
            <p><a href="${permitLink}" style="background:#dc2626;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block;">Review Permit Details</a></p>
        `;

        telegramHtml = `
<b>❌ Permit REJECTED</b>
<b>Permit:</b> ${ptw.ptw_number}
<b>Project:</b> ${ptw.project_name}
<b>Reason:</b> ${ptw.rejection_reason || 'Safety criteria not met'}

👉 <a href="${permitLink}">Review Details</a>
        `.trim();
    }

    // Dispatch to each recipient with isolated try/catch blocks
    for (const r of recipients) {
        if (r.email) {
            // 1. Resend Email Dispatch
            try {
                await sendResendEmail({
                    to: r.email,
                    subject,
                    htmlContent: emailHtml,
                    apiKey: env.RESEND_API_KEY
                });
            } catch (err) {
                console.error(`[Dispatch Error] Email to ${r.email} failed:`, err);
            }

            // 2. Telegram Dispatch
            try {
                const chatId = await getTelegramChatIdByEmail(db, r.email);
                if (chatId) {
                    await sendTelegramMessage({
                        chatId,
                        htmlMessage: telegramHtml,
                        botToken: env.TELEGRAM_BOT_TOKEN
                    });
                }
            } catch (err) {
                console.error(`[Dispatch Error] Telegram to ${r.email} failed:`, err);
            }
        }
    }
}
