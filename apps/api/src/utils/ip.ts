import { Request } from 'express';

/**
 * Extract the real client IP address from the request
 * Handles various proxy headers and fallbacks
 */
export const getRealClientIP = (req: Request): string => {
  // With app.set('trust proxy', true), req.ip should contain the real client IP
  if (req.ip && req.ip !== '127.0.0.1' && req.ip !== '::1') {
    return req.ip;
  }

  // Check various proxy headers as fallbacks
  const xForwardedFor = req.get('X-Forwarded-For');
  if (xForwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one (original client)
    const firstIP = xForwardedFor.split(',')[0].trim();
    if (firstIP && firstIP !== '127.0.0.1' && firstIP !== '::1') {
      return firstIP;
    }
  }

  const xRealIP = req.get('X-Real-IP');
  if (xRealIP && xRealIP !== '127.0.0.1' && xRealIP !== '::1') {
    return xRealIP;
  }

  const xClientIP = req.get('X-Client-IP');
  if (xClientIP && xClientIP !== '127.0.0.1' && xClientIP !== '::1') {
    return xClientIP;
  }

  const cfConnectingIP = req.get('CF-Connecting-IP'); // CloudFlare
  if (cfConnectingIP && cfConnectingIP !== '127.0.0.1' && cfConnectingIP !== '::1') {
    return cfConnectingIP;
  }

  // Fallback to connection remote address
  const remoteAddress = req.socket.remoteAddress;
  if (remoteAddress && remoteAddress !== '127.0.0.1' && remoteAddress !== '::1') {
    return remoteAddress;
  }

  // Final fallback - this indicates a configuration issue
  console.warn('Could not determine real client IP, using fallback');
  return '0.0.0.0';
};

/**
 * Log IP detection debug information
 */
export const logIPDebugInfo = (req: Request): void => {
  console.log('IP Debug Info:', {
    'req.ip': req.ip,
    'req.socket.remoteAddress': req.socket.remoteAddress,
    'X-Forwarded-For': req.get('X-Forwarded-For'),
    'X-Real-IP': req.get('X-Real-IP'),
    'X-Client-IP': req.get('X-Client-IP'),
    'CF-Connecting-IP': req.get('CF-Connecting-IP'),
    'User-Agent': req.get('User-Agent'),
    'Host': req.get('Host')
  });
}; 