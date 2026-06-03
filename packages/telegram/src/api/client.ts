/**
 * Telegram Bot API HTTP 客户端
 */
import axios, { type AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import { redactToken } from '../utils/redact';

const TELEGRAM_API_BASE = 'https://api.telegram.org';

export interface TelegramApiOptions {
    token: string;
    timeoutMs?: number;
}

export function createTelegramClient(token: string): AxiosInstance {
    logger.info(`Creating Telegram client for bot ${redactToken(token)}`);
    return axios.create({
        baseURL: `${TELEGRAM_API_BASE}/bot${token}`,
        timeout: 60_000,
        headers: { 'Content-Type': 'application/json' }
    });
}
