import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { Twilio } from 'twilio';

export interface DeliveryResult {
  ok: boolean;
  error?: string;
}

export interface EmailBatchItem {
  to: string;
  subject: string;
  text: string;
}

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);
  private resendClient: Resend | null = null;
  private twilioClient: Twilio | null = null;

  private getResend(): Resend {
    if (this.resendClient) return this.resendClient;
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('Resend not configured. Set RESEND_API_KEY in .env to send emails.');
    }
    this.resendClient = new Resend(apiKey);
    return this.resendClient;
  }

  private getTwilio() {
    if (this.twilioClient) return this.twilioClient;
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token) return null;
    this.twilioClient = new Twilio(sid, token);
    return this.twilioClient;
  }

  private get smsProvider(): 'twilio' | 'africastalking' | 'dev' {
    const explicit = process.env.SMS_PROVIDER?.toLowerCase();
    if (explicit === 'twilio' || explicit === 'africastalking' || explicit === 'dev') {
      return explicit;
    }
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_SMS_FROM) {
      return 'twilio';
    }
    if (process.env.AT_USERNAME && process.env.AT_API_KEY && process.env.AT_SMS_FROM) {
      return 'africastalking';
    }
    return 'dev';
  }

  private get atUsername(): string | undefined {
    return process.env.AT_USERNAME || undefined;
  }

  private get atApiKey(): string | undefined {
    return process.env.AT_API_KEY || undefined;
  }

  async sendEmail(to: string, subject: string, text: string): Promise<DeliveryResult> {
    const resend = this.getResend();
    const from = process.env.RESEND_FROM_EMAIL ?? process.env.MAIL_FROM;
    if (!from) throw new Error('Email sender not configured. Set RESEND_FROM_EMAIL in .env.');

    const { error } = await resend.emails.send({
      from,
      to,
      subject,
      html: this.textToHtml(text),
    });

    if (error) {
      throw new Error(`Resend error: ${error.message}`);
    }
    return { ok: true };
  }

  async sendEmailBatch(items: EmailBatchItem[]): Promise<{ ok: boolean; sent: number; failed: number; errors: string[] }> {
    if (items.length === 0) return { ok: true, sent: 0, failed: 0, errors: [] };

    const resend = this.getResend();
    const from = process.env.RESEND_FROM_EMAIL ?? process.env.MAIL_FROM;
    if (!from) throw new Error('Email sender not configured. Set RESEND_FROM_EMAIL in .env.');

    const batch = items.map((item) => ({
      from,
      to: item.to,
      subject: item.subject,
      html: this.textToHtml(item.text),
    }));

    const { data, error } = await resend.batch.send(batch);

    if (error) {
      this.logger.warn(`Resend batch request failed: ${error.message}`);
      return {
        ok: false,
        sent: 0,
        failed: items.length,
        errors: Array(items.length).fill(error.message),
      };
    }

    const errors: string[] = [];
    let sent = 0;
    let failed = 0;

    if (data?.data) {
      for (const result of data.data) {
        if (result.id) {
          sent++;
          errors.push('');
        } else {
          failed++;
          errors.push('Batch item delivery failed');
        }
      }
    } else {
      failed = items.length;
      for (let i = 0; i < items.length; i++) {
        errors.push('No response from Resend');
      }
    }

    return { ok: failed === 0, sent, failed, errors };
  }

  private textToHtml(text: string): string {
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    const paragraphs = escaped
      .split(/\n\n+/)
      .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
      .join('');
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:sans-serif;line-height:1.6;color:#333;}p{margin:0 0 12px 0;}</style></head><body>${paragraphs}</body></html>`;
  }

  async sendSms(to: string, text: string): Promise<DeliveryResult> {
    if (this.smsProvider === 'twilio') return this.sendSmsViaTwilio(to, text);
    if (this.smsProvider === 'africastalking') return this.sendSmsViaAfricaTalking(to, text);
    this.logSimulated('SMS', to, text);
    return { ok: true };
  }

  private async sendSmsViaTwilio(to: string, text: string): Promise<DeliveryResult> {
    const client = this.getTwilio();
    const from = process.env.TWILIO_SMS_FROM;
    if (!client || !from) {
      throw new Error('Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_SMS_FROM in .env.');
    }
    const normalized = this.normalizePhone(to);
    await client.messages.create({ from, to: normalized, body: text });
    return { ok: true };
  }

  private async sendSmsViaAfricaTalking(to: string, text: string): Promise<DeliveryResult> {
    const username = this.atUsername;
    const apiKey = this.atApiKey;
    const from = process.env.AT_SMS_FROM;
    if (!username || !apiKey || !from) {
      throw new Error("Africa's Talking not configured. Set AT_USERNAME, AT_API_KEY and AT_SMS_FROM in .env.");
    }
    if (text.length > 918) {
      throw new Error("Message exceeds Africa's Talking 918-character limit");
    }
    const normalized = this.normalizePhone(to);
    const res = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({ username, to: normalized, message: text, from }).toString(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`Africa's Talking error (${res.status}): ${data?.message ?? res.statusText}`);
    }
    const recipients: Array<{ status: string; failureReason?: string }> = data?.SMSMessageData?.Recipients ?? [];
    const rejected = recipients.find((r) => r.status === 'Rejected');
    if (rejected) {
      throw new Error(`Africa's Talking rejected message: ${rejected.failureReason ?? 'unknown reason'}`);
    }
    return { ok: true };
  }

  async makeCall(to: string, script: string): Promise<DeliveryResult> {
    if (this.smsProvider === 'africastalking' && this.atUsername && this.atApiKey) {
      return this.makeCallViaAfricaTalking(to, script);
    }
    const client = this.getTwilio();
    const from = process.env.TWILIO_CALL_FROM;
    if (client && from) {
      const normalized = this.normalizePhone(to);
      const twiml = this.buildCallTwiML(script);
      await client.calls.create({ from, to: normalized, twiml });
      return { ok: true };
    }
    if (this.smsProvider === 'dev') {
      this.logSimulated('CALL', to, script);
      return { ok: true };
    }
    throw new Error('No voice provider configured. Set Africa\'s Talking (AT_USERNAME, AT_API_KEY) or Twilio credentials in .env.');
  }

  private async makeCallViaAfricaTalking(to: string, script: string): Promise<DeliveryResult> {
    const username = this.atUsername!;
    const apiKey = this.atApiKey!;
    const from = process.env.AT_CALL_FROM ?? process.env.AT_SMS_FROM;
    if (!from) {
      throw new Error("Africa's Talking call not configured. Set AT_CALL_FROM in .env.");
    }
    const normalized = this.normalizePhone(to);

    const res = await fetch('https://api.africastalking.com/version1/voice', {
      method: 'POST',
      headers: {
        apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        username,
        to: normalized,
        from,
        callAction: 'say',
        voiceText: script,
      }).toString(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`Africa's Talking voice error (${res.status}): ${data?.message ?? res.statusText}`);
    }
    return { ok: true };
  }

  private logSimulated(channel: string, to: string, body: string) {
    this.logger.warn(
      `[${channel}] simulated delivery (no provider configured). To: ${to}\n${body}`,
    );
  }

  private buildCallTwiML(script: string) {
    const escaped = script
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<Response><Say voice="alice">${escaped}</Say></Response>`;
  }

  normalizePhone(phone: string): string {
    let digits = phone.replace(/[^0-9+]/g, '');

    if (digits.startsWith('+')) {
      if (/^\+[1-9]\d{7,14}$/.test(digits)) return digits;
    }

    if (digits.startsWith('233') && digits.length >= 12) {
      const e164 = `+${digits}`;
      if (/^\+[1-9]\d{7,14}$/.test(e164)) return e164;
    }

    if (digits.startsWith('0') && digits.length >= 10) {
      const international = `+233${digits.slice(1)}`;
      if (/^\+233[1-9]\d{7,8}$/.test(international)) return international;
    }

    throw new Error(`Invalid phone number format: ${phone}. Use E.164 (+233...) or local Ghana format (0XXXXXXXXX).`);
  }
}
