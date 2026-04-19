const crypto = require('crypto');

// ========== MOMO ==========
async function createMomoPayment(amount, orderId, returnUrl, notifyUrl) {
  const partnerCode = process.env.MOMO_PARTNER_CODE || 'MOMO_TEST';
  const accessKey = process.env.MOMO_ACCESS_KEY || '';
  const secretKey = process.env.MOMO_SECRET_KEY || '';
  if (!accessKey || !secretKey) {
    console.warn('[Momo] Payment keys not configured — aborting payment creation');
    return { resultCode: -1, message: 'Momo payment not configured' };
  }
  const requestId = `${orderId}_${Date.now()}`;
  const orderInfo = `CCB Mart nap tien #${orderId}`;
  const extraData = '';
  const requestType = 'captureWallet';

  const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${notifyUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${returnUrl}&requestId=${requestId}&requestType=${requestType}`;
  const signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');

  try {
    const momoBaseUrl = process.env.MOMO_API_URL || 'https://test-payment.momo.vn';
    const res = await fetch(`${momoBaseUrl}/v2/gateway/api/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partnerCode, accessKey, requestId, amount: parseInt(amount), orderId, orderInfo,
        redirectUrl: returnUrl, ipnUrl: notifyUrl, extraData, requestType, signature, lang: 'vi',
      }),
    });
    return await res.json();
  } catch (err) {
    console.error('[Momo] Error:', err.message);
    return { resultCode: -1, message: err.message };
  }
}

function verifyMomoSignature(data, signature) {
  const secretKey = process.env.MOMO_SECRET_KEY || '';
  const rawSignature = `accessKey=${process.env.MOMO_ACCESS_KEY}&amount=${data.amount}&extraData=${data.extraData}&message=${data.message}&orderId=${data.orderId}&orderInfo=${data.orderInfo}&orderType=${data.orderType}&partnerCode=${data.partnerCode}&payType=${data.payType}&requestId=${data.requestId}&responseTime=${data.responseTime}&resultCode=${data.resultCode}&transId=${data.transId}`;
  const expected = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');
  return expected === signature;
}

// ========== ZALOPAY ==========
async function createZaloPayPayment(amount, orderId, returnUrl, callbackUrl) {
  const appId = process.env.ZALOPAY_APP_ID || '';
  const key1 = process.env.ZALOPAY_KEY1 || '';
  if (!appId || !key1) {
    console.warn('[ZaloPay] Payment keys not configured — aborting payment creation');
    return { return_code: -1, return_message: 'ZaloPay payment not configured' };
  }
  const appTransId = `${new Date().toISOString().slice(2, 10).replace(/-/g, '')}${orderId}`;
  const appTime = Date.now();
  const embedData = JSON.stringify({ redirecturl: returnUrl });
  const item = JSON.stringify([]);

  const macData = `${appId}|${appTransId}|customer|${amount}|${appTime}|${embedData}|${item}`;
  const mac = crypto.createHmac('sha256', key1).update(macData).digest('hex');

  try {
    const zaloPayBaseUrl = process.env.ZALOPAY_API_URL || 'https://sb-openapi.zalopay.vn';
    const res = await fetch(`${zaloPayBaseUrl}/v2/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: parseInt(appId), app_trans_id: appTransId, app_user: 'customer',
        app_time: appTime, amount: parseInt(amount), item, embed_data: embedData,
        callback_url: callbackUrl, description: `CCB Mart nap tien #${orderId}`, mac,
      }),
    });
    const result = await res.json();
    return { ...result, appTransId };
  } catch (err) {
    console.error('[ZaloPay] Error:', err.message);
    return { return_code: -1, return_message: err.message };
  }
}

function verifyZaloPayCallback(data, reqMac) {
  const key2 = process.env.ZALOPAY_KEY2 || '';
  const mac = crypto.createHmac('sha256', key2).update(data).digest('hex');
  return mac === reqMac;
}

module.exports = { createMomoPayment, verifyMomoSignature, createZaloPayPayment, verifyZaloPayCallback };
