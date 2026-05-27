const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'soumadeepshee7@gmail.com';
const SENDER_NAME = process.env.SENDER_NAME || 'Innovision';

export async function sendEmail({ to, subject, htmlContent, textContent }) {
    try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'api-key': BREVO_API_KEY,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                sender: { name: SENDER_NAME, email: SENDER_EMAIL },
                to: [{ email: to }],
                subject,
                htmlContent,
                textContent,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Brevo API error:', response.status, errorData);
            throw new Error(errorData.message || `Brevo API returned ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Email send error:', error.message);
        throw error;
    }
}

export async function sendCourseCompletionEmail(userEmail, userName, courseTitle) {
    const subject = `Congratulations! You've completed ${courseTitle}`;
    const htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #6366f1;">Mission Accomplished!</h2>
            <p>Hi ${userName || 'Learner'},</p>
            <p>Amazing job! You have successfully completed the course: <strong>${courseTitle}</strong>.</p>
            <p>Your dedication to learning is inspiring. Keep up the great work and check out more roadmaps to continue your journey.</p>
            <div style="margin-top: 30px; text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/roadmap" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Continue Learning</a>
            </div>
            <p style="margin-top: 30px; font-size: 0.8em; color: #666;">Best regards,<br>The Innovision Team</p>
        </div>
    `;
    const textContent = `Congratulations! You have successfully completed the course: ${courseTitle}. Keep up the great work!`;
    return sendEmail({ to: userEmail, subject, htmlContent, textContent });
}

export async function sendInactivityReminderEmail(userEmail, userName, courseTitle) {
    const subject = `Don't stop now! Continue your journey with ${courseTitle}`;
    const htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #6366f1;">Ready to jump back in?</h2>
            <p>Hi ${userName || 'Learner'},</p>
            <p>We noticed you haven't made progress on your course <strong>${courseTitle}</strong> recently.</p>
            <p>Every small step counts towards mastering your goals. Why not spend just 10 minutes today to keep the momentum going?</p>
            <div style="margin-top: 30px; text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/roadmap" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Resume Course</a>
            </div>
            <p style="margin-top: 30px; font-size: 0.8em; color: #666;">Best regards,<br>The Innovision Team</p>
        </div>
    `;
    const textContent = `Ready to jump back in? We noticed you haven't made progress on your course ${courseTitle} recently. Why not spend 10 minutes today?`;
    return sendEmail({ to: userEmail, subject, htmlContent, textContent });
}
