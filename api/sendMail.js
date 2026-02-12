// api/sendMail.js
export default async function handler(req, res) {
  // ✅ CORS headers - DONO domains ke liye
  res.setHeader('Access-Control-Allow-Origin', 'https://www.ep-fitness.com');
  res.setHeader('Access-Control-Allow-Origin', 'https://ep-fitness.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // ✅ Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ✅ Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { 
    formType,
    name, 
    firstName, 
    lastName, 
    fullName,
    email, 
    phone, 
    service, 
    message,
    package: selectedPackage,
    price,
    age,
    location,
    goal,
    healthConditions,
    notes,
    details
  } = req.body;

  // ✅ Validate required fields
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    // ✅ Nodemailer with Gmail SMTP
    const nodemailer = require('nodemailer');
    
    let transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    let emailSubject, emailHtml;

    // 📧 CONTACT FORM EMAIL
    if (formType === 'contact') {
      emailSubject = `📬 New Contact Form - EP Fitness`;
      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #212121; margin: 0; padding: 0; background: #f5f5f5; }
            .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
            .header { background: #e53935; padding: 30px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 800; }
            .header p { color: rgba(255,255,255,0.9); margin: 10px 0 0; }
            .content { padding: 40px; }
            .field { margin-bottom: 25px; }
            .label { font-weight: 700; color: #212121; display: block; margin-bottom: 8px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
            .value { background: #f8f9fa; padding: 15px 20px; border-radius: 10px; border-left: 5px solid #e53935; font-size: 16px; }
            .footer { background: #212121; color: white; padding: 25px; text-align: center; }
            .footer a { color: #e53935; text-decoration: none; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏋️ EP FITNESS</h1>
              <p>New Contact Form Submission</p>
            </div>
            <div class="content">
              <div class="field">
                <span class="label">👤 Full Name</span>
                <div class="value">${name || 'Not provided'}</div>
              </div>
              <div class="field">
                <span class="label">📧 Email Address</span>
                <div class="value">${email}</div>
              </div>
              <div class="field">
                <span class="label">📞 Phone Number</span>
                <div class="value">${phone || 'Not provided'}</div>
              </div>
              <div class="field">
                <span class="label">🎯 Service Interested In</span>
                <div class="value">${service || 'Not specified'}</div>
              </div>
              <div class="field">
                <span class="label">💬 Message</span>
                <div class="value">${message || 'No message'}</div>
              </div>
            </div>
            <div class="footer">
              <p style="margin:0; color:#fff;">📅 <a href="https://calendly.com/ep_fitness/fitness-assessment-consultation">Book Free Assessment</a></p>
              <p style="margin:10px 0 0; color:#999; font-size:13px;">Reply to this email to contact the client directly</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } 
    
    // 📦 PACKAGE FORM EMAIL
    else if (formType === 'package') {
      // Use fullName if available, otherwise combine firstName + lastName
      const clientName = fullName || `${firstName || ''} ${lastName || ''}`.trim();
      
      emailSubject = `💪 New Package Sign-Up - EP Fitness`;
      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #212121; background: #f5f5f5; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
            .header { background: #e53935; padding: 30px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; }
            .package-badge { background: #fff3cd; border: 2px solid #ffc107; padding: 25px; margin: 30px; border-radius: 15px; text-align: center; }
            .package-name { color: #e53935; font-size: 22px; font-weight: 800; margin: 0 0 10px; }
            .package-price { color: #e53935; font-size: 32px; font-weight: 900; margin: 10px 0; }
            .content { padding: 0 30px 30px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
            .info-item { background: #f8f9fa; padding: 15px; border-radius: 10px; }
            .info-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
            .info-value { font-size: 16px; font-weight: 600; color: #212121; }
            hr { border: none; border-top: 2px solid #eee; margin: 30px 0; }
            .footer { background: #212121; color: white; padding: 25px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💪 EP FITNESS</h1>
              <p>New Package Purchase Request</p>
            </div>
            
            <div class="package-badge">
              <div style="font-size: 14px; color: #856404; margin-bottom: 10px;">🎯 SELECTED PACKAGE</div>
              <div class="package-name">${selectedPackage || ''}</div>
              <div class="package-price">${price || ''}</div>
              <div style="color: #666; margin-top: 10px;">${details || ''}</div>
            </div>
            
            <div class="content">
              <h3 style="color: #e53935; margin-top: 0; border-bottom: 3px solid #e53935; padding-bottom: 10px;">👤 CLIENT INFORMATION</h3>
              
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Full Name</div>
                  <div class="info-value">${clientName || ''}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Age</div>
                  <div class="info-value">${age || 'Not provided'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Email</div>
                  <div class="info-value">${email || ''}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Phone</div>
                  <div class="info-value">${phone || ''}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Location</div>
                  <div class="info-value">${location || 'Not specified'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Primary Goal</div>
                  <div class="info-value">${goal || ''}</div>
                </div>
              </div>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-top: 20px;">
                <div style="font-weight: 700; color: #212121; margin-bottom: 10px;">🏥 Health Conditions</div>
                <div style="color: #666;">${healthConditions || 'None reported'}</div>
              </div>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-top: 20px;">
                <div style="font-weight: 700; color: #212121; margin-bottom: 10px;">📝 Additional Notes</div>
                <div style="color: #666;">${notes || 'No additional notes'}</div>
              </div>
            </div>
            
            <div class="footer">
              <p style="margin:0; color: #e53935; font-size: 18px; font-weight: bold;">⏰ Contact within 24 hours</p>
              <p style="margin:10px 0 0; color: #999;">Client Phone: ${phone || 'Not provided'}</p>
              <p style="margin:5px 0 0; color: #999;">Client Email: ${email || ''}</p>
            </div>
          </div>
        </body>
        </html>
      `;
    }

    // ✅ Send to EP Fitness email
    await transporter.sendMail({
      from: `"EP Fitness Website" <${process.env.EMAIL_USER}>`,
      to: "epfitness24@gmail.com",
      replyTo: email,
      subject: emailSubject,
      html: emailHtml
    });

    // ✅ Send confirmation to client
    if (formType === 'contact') {
      await transporter.sendMail({
        from: `"EP Fitness by Coach Emman" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "✅ We received your message - EP Fitness",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 5px 20px rgba(0,0,0,0.1);">
            <div style="background: #e53935; padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🏋️ EP FITNESS</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Thank you for contacting us, ${name}!</p>
            </div>
            <div style="padding: 40px;">
              <p style="font-size: 18px; color: #212121;">We've received your message and will get back to you within <strong style="color: #e53935;">24 hours</strong>.</p>
              
              <div style="background: #f5f5f5; padding: 25px; border-radius: 10px; margin: 30px 0; border-left: 5px solid #e53935;">
                <p style="margin: 0 0 10px; font-weight: bold;">📋 Your submission:</p>
                <p style="margin: 5px 0; color: #666;">Service: ${service}</p>
                <p style="margin: 5px 0; color: #666;">Message: ${message}</p>
              </div>
              
              <a href="https://calendly.com/ep_fitness/fitness-assessment-consultation" 
                 style="display: inline-block; background: #e53935; color: white; text-decoration: none; padding: 15px 30px; border-radius: 50px; font-weight: bold; margin: 20px 0;">
                📅 Book Your Free Assessment
              </a>
              
              <hr style="border: 1px solid #eee; margin: 30px 0;">
              
              <p style="color: #666;">Coach Emman & EP Fitness Team</p>
              <p style="color: #999; font-size: 14px;">📞 +63-906-279-6854</p>
            </div>
          </div>
        `
      });
    }

    if (formType === 'package') {
      const clientName = fullName || `${firstName || ''} ${lastName || ''}`.trim();
      
      await transporter.sendMail({
        from: `"EP Fitness by Coach Emman" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "✅ Your EP Fitness package request is received!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 5px 20px rgba(0,0,0,0.1);">
            <div style="background: #e53935; padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">💪 EP FITNESS</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Thanks for choosing us, ${clientName}!</p>
            </div>
            
            <div style="padding: 40px;">
              <div style="background: #fff3cd; border: 2px solid #ffc107; padding: 25px; border-radius: 15px; margin-bottom: 30px; text-align: center;">
                <h2 style="color: #e53935; margin-top: 0; font-size: 22px;">📦 YOUR SELECTED PACKAGE</h2>
                <p style="font-size: 20px; font-weight: bold; color: #212121; margin: 15px 0;">${selectedPackage}</p>
                <p style="font-size: 28px; color: #e53935; font-weight: 900; margin: 10px 0;">${price}</p>
              </div>
              
              <h3 style="color: #212121; border-bottom: 3px solid #e53935; padding-bottom: 10px;">🚀 NEXT STEPS</h3>
              
              <ol style="background: #f5f5f5; padding: 25px 25px 25px 45px; border-radius: 10px; margin: 20px 0;">
                <li style="margin-bottom: 15px; color: #212121;"><strong>Step 1:</strong> Coach Emman will contact you within <strong style="color: #e53935;">24 hours</strong></li>
                <li style="margin-bottom: 15px; color: #212121;"><strong>Step 2:</strong> You'll receive payment instructions via SMS/Email</li>
                <li style="margin-bottom: 15px; color: #212121;"><strong>Step 3:</strong> We'll schedule your first session immediately</li>
                <li style="color: #212121;"><strong>Step 4:</strong> Start your transformation journey! 🎯</li>
              </ol>
              
              <div style="background: #212121; color: white; padding: 25px; border-radius: 10px; text-align: center; margin-top: 30px;">
                <p style="margin: 0; font-size: 18px;">📞 Call us anytime: <strong style="color: #e53935;">+63-906-279-6854</strong></p>
                <p style="margin: 10px 0 0; color: #999;">Email: epfitness24@gmail.com</p>
              </div>
            </div>
          </div>
        `
      });
    }

    return res.status(200).json({ 
      success: true, 
      message: "Form submitted successfully! Check your email for confirmation." 
    });

  } catch (error) {
    console.error("Email Error:", error);
    return res.status(500).json({ 
      error: "Failed to send email. Please try again or contact us directly at epfitness24@gmail.com" 
    });
  }
}
