addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
  });
  
  async function handleRequest(request) {
    // Access environment variables
    // TO_EMAIL: Correo del destinatario (por ejemplo, fz1@contraentregaco.com)
    // SENDER_EMAIL: Correo de envío verificado en SendGrid (por ejemplo, tutienda@gmail.com)
    // SENDER_NAME: Nombre del remitente (por ejemplo, Tienda FZ2)
    // SENDGRID_API_KEY: Clave API de SendGrid
    const TO_EMAIL = typeof env !== 'undefined' ? env.TO_EMAIL : 'fz1@contraentregaco.com';
    const SENDER_EMAIL = typeof env !== 'undefined' ? env.SENDER_EMAIL : 'tutienda@gmail.com'; // Reemplaza con tu correo verificado
    const SENDER_NAME = typeof env !== 'undefined' ? env.SENDER_NAME : 'Tienda FZ2';
    const SENDGRID_API_KEY = typeof env !== 'undefined' ? env.SENDGRID_API_KEY : ''; // Configura en variables de entorno
  
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }
  
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  
    try {
      const data = await request.json();
  
      // Extract order details
      const {
        _subject = 'Nuevo pedido',
        customerDetails = {},
        itemsDetails = [],
        orderSummary = {},
        items = 'No items provided', // Legacy field for compatibility
      } = data;
  
      // Generate HTML email content
      const emailHtml = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Nuevo Pedido</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background-color: #f8f9fa;
              margin: 0;
              padding: 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              padding: 20px;
            }
            h1 {
              color: #212529;
              text-align: center;
              font-size: 24px;
            }
            h2 {
              color: #343a40;
              font-size: 18px;
              margin-top: 20px;
              border-bottom: 1px solid #dee2e6;
              padding-bottom: 5px;
            }
            p {
              color: #495057;
              font-size: 14px;
              margin: 5px 0;
            }
            .item-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid #f1f3f5;
            }
            .item-row:last-child {
              border-bottom: none;
            }
            .item-name {
              flex: 2;
              font-weight: 500;
            }
            .item-quantity, .item-price, .item-subtotal {
              flex: 1;
              text-align: right;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 5px 0;
              font-size: 14px;
            }
            .summary-row.total {
              font-weight: bold;
              font-size: 16px;
              border-top: 2px solid #dee2e6;
              padding-top: 10px;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              color: #868e96;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>${_subject}</h1>
  
            <h2>Información del Cliente</h2>
            <p><strong>Nombre:</strong> ${customerDetails.name || 'No proporcionado'}</p>
            <p><strong>Teléfono:</strong> ${customerDetails.phone || 'No proporcionado'}</p>
            <p><strong>Email:</strong> ${customerDetails.email || 'No proporcionado'}</p>
            <p><strong>Dirección:</strong> ${customerDetails.address || 'No proporcionado'}</p>
  
            <h2>Ítems del Pedido</h2>
            ${
              itemsDetails.length > 0
                ? itemsDetails.map(item => `
                  <div class="item-row">
                    <span class="item-name">${item.name || 'No especificado'}</span>
                    <span class="item-quantity">x${item.quantity || 0}</span>
                    <span class="item-price">$${Number(item.price || 0).toLocaleString('es-CO')}</span>
                    <span class="item-subtotal">$${Number(item.subtotal || 0).toLocaleString('es-CO')}</span>
                  </div>
                `).join('')
                : '<p>No se proporcionaron detalles de los ítems</p>'
            }
  
            <h2>Resumen del Pedido</h2>
            <div class="summary-row">
              <span>Subtotal:</span>
              <span>$${Number(orderSummary.subtotal || 0).toLocaleString('es-CO')}</span>
            </div>
            <div class="summary-row">
              <span>Costo de envío:</span>
              <span>$${Number(orderSummary.deliveryFee || 0).toLocaleString('es-CO')}</span>
            </div>
            <div class="summary-row total">
              <span>Total:</span>
              <span>$${Number(orderSummary.total || 0).toLocaleString('es-CO')}</span>
            </div>
            <div class="summary-row">
              <span>Método de pago:</span>
              <span>${orderSummary.paymentMethod || 'No especificado'}</span>
            </div>
            <div class="summary-row">
              <span>ID del pedido:</span>
              <span>${orderSummary.orderId || 'No proporcionado'}</span>
            </div>
  
            <div class="footer">
              <p>Enviado por FZ2 - Tienda Completa</p>
              <p>Cali, Colombia</p>
            </div>
          </div>
        </body>
        </html>
      `;
  
      // Prepare email payload for SendGrid
      const emailPayload = {
        personalizations: [
          {
            to: [{ email: TO_EMAIL }],
          },
        ],
        from: {
          email: SENDER_EMAIL,
          name: SENDER_NAME,
        },
        subject: _subject,
        content: [
          {
            type: 'text/html',
            value: emailHtml,
          },
        ],
      };
  
      // Send email via SendGrid API
      const sendGridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        },
        body: JSON.stringify(emailPayload),
      });
  
      if (!sendGridResponse.ok) {
        throw new Error(`SendGrid error: ${sendGridResponse.status} ${await sendGridResponse.text()}`);
      }
  
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (error) {
      console.error('Error processing request:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  }
