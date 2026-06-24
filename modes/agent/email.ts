import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import nodemailer from "nodemailer";
import { tool } from "ai";
import { z } from "zod";

function getImapConfig() {
  return {
    host: process.env.EMAIL_IMAP_HOST || "imap.gmail.com",
    port: parseInt(process.env.EMAIL_IMAP_PORT || "993", 10),
    secure: true,
    auth: {
      user: process.env.EMAIL_USER || "",
      pass: process.env.EMAIL_PASSWORD || "",
    },
    logger: false as const,
  };
}

function getSmtpConfig() {
  return {
    host: process.env.EMAIL_SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_SMTP_PORT || "465", 10),
    secure: true,
    auth: {
      user: process.env.EMAIL_USER || "",
      pass: process.env.EMAIL_PASSWORD || "",
    },
  };
}

/**
 * Fetch a list of recent unread emails.
 */
export async function listUnreadEmails(limit = 10) {
  const config = getImapConfig();
  if (!config.auth.user || !config.auth.pass) {
    throw new Error("Email credentials are not configured in environment variables.");
  }

  const client = new ImapFlow(config as any);
  await client.connect();

  const lock = await client.getMailboxLock("INBOX");
  const emails: Array<{
    uid: number;
    subject: string;
    from: string;
    date: string;
    snippet: string;
  }> = [];

  try {
    const searchResult = await client.search({ seen: false });
    // Get last 'limit' messages
    const uids = Array.isArray(searchResult) ? searchResult.slice(-limit) : [];

    for (const uid of uids) {
      const message = await client.fetchOne(String(uid), {
        envelope: true,
        source: true,
      });

      if (message && message.source) {
        const parsed = await simpleParser(message.source);
        emails.push({
          uid,
          subject: parsed.subject || "(No Subject)",
          from: parsed.from?.text || (message.envelope && message.envelope.from ? message.envelope.from.map(f => `${f.name || ""} <${f.address || ""}>`).join(", ") : "Unknown"),
          date: parsed.date ? parsed.date.toISOString() : new Date().toISOString(),
          snippet: parsed.text ? parsed.text.substring(0, 200).replace(/\s+/g, " ") : "",
        });
      }
    }
  } finally {
    lock.release();
    await client.logout();
  }

  return emails;
}

/**
 * Get full email details including complete text body.
 */
export async function readEmailBody(uid: number) {
  const config = getImapConfig();
  if (!config.auth.user || !config.auth.pass) {
    throw new Error("Email credentials are not configured in environment variables.");
  }

  const client = new ImapFlow(config as any);
  await client.connect();

  const lock = await client.getMailboxLock("INBOX");
  try {
    const message = await client.fetchOne(String(uid), { source: true });
    if (!message || !message.source) {
      throw new Error(`Email with UID ${uid} not found.`);
    }

    const parsed = await simpleParser(message.source);
    return {
      uid,
      subject: parsed.subject || "(No Subject)",
      from: parsed.from?.text || "Unknown",
      to: parsed.to ? (Array.isArray(parsed.to) ? parsed.to.map(t => t.text).join(", ") : parsed.to.text) : "",
      date: parsed.date ? parsed.date.toISOString() : new Date().toISOString(),
      body: parsed.text || parsed.html || "(No content)",
      messageId: parsed.messageId,
    };
  } finally {
    lock.release();
    await client.logout();
  }
}

/**
 * Send an email or reply to an existing one.
 */
export async function sendOrReplyEmail(options: {
  to: string;
  subject: string;
  body: string;
  replyToMessageId?: string;
}) {
  const config = getSmtpConfig();
  if (!config.auth.user || !config.auth.pass) {
    throw new Error("Email credentials are not configured in environment variables.");
  }

  const transporter = nodemailer.createTransport(config);

  const mailOptions: nodemailer.SendMailOptions = {
    from: config.auth.user,
    to: options.to,
    subject: options.subject,
    text: options.body,
  };

  if (options.replyToMessageId) {
    mailOptions.headers = {
      "In-Reply-To": options.replyToMessageId,
      "References": options.replyToMessageId,
    };
  }

  const info = await transporter.sendMail(mailOptions);
  return {
    messageId: info.messageId,
    response: info.response,
  };
}

// Define the tools for the AI agent
export const emailTools = {
  email_list_unread: tool({
    description: "List unread emails from the inbox.",
    inputSchema: z.object({
      limit: z.number().optional().default(10).describe("Maximum number of emails to fetch"),
    }),
    execute: async ({ limit }) => {
      try {
        const emails = await listUnreadEmails(limit);
        return JSON.stringify(emails, null, 2);
      } catch (e) {
        return `Error listing emails: ${(e as Error).message}`;
      }
    },
  }),

  email_read_body: tool({
    description: "Read the full text content of a specific email by its unique ID (UID).",
    inputSchema: z.object({
      uid: z.number().describe("The UID of the email to read"),
    }),
    execute: async ({ uid }) => {
      try {
        const details = await readEmailBody(uid);
        return JSON.stringify(details, null, 2);
      } catch (e) {
        return `Error reading email: ${(e as Error).message}`;
      }
    },
  }),

  email_send_or_reply: tool({
    description: "Send a new email or reply to an existing email/thread.",
    inputSchema: z.object({
      to: z.string().describe("Recipient email address"),
      subject: z.string().describe("Subject of the email"),
      body: z.string().describe("The plain text body content of the email"),
      replyToMessageId: z.string().optional().describe("Optionally the Message-ID of the email to reply to for threading"),
    }),
    execute: async ({ to, subject, body, replyToMessageId }) => {
      try {
        const result = await sendOrReplyEmail({ to, subject, body, replyToMessageId });
        return `Email sent successfully. Message ID: ${result.messageId}`;
      } catch (e) {
        return `Error sending email: ${(e as Error).message}`;
      }
    },
  }),
};
