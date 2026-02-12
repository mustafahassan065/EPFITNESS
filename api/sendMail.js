// api/sendMail.js
import nodemailer from "nodemailer";

export default async function handler(req, res) {
  // ✅ Allow only POST requests
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

  try {
    // ✅ Gmail SMTP configuration - EXACTLY like your original working code
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
      emailSubject = `📬 New Contact Form Submission - EP Fitness`;
      emailHtml = `
        <h2>New Contact Form Submission</h2>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Phone:</b> ${phone}</p>
        <p><b>Service:</b> ${service}</p>
        <p><b>Message:</b> ${message}</p>
      `;
    } 
    
    // 📦 PACKAGE FORM EMAIL
    else if (formType === 'package') {
      const clientName = fullName || `${firstName || ''} ${lastName || ''}`.trim();
      
      emailSubject = `💪 New Package Sign-Up - EP Fitness`;
      emailHtml = `
        <h2>New Package Sign-Up Request</h2>
        <h3 style="color: #e53935;">📦 SELECTED PACKAGE</h3>
        <p><b>Package:</b> ${selectedPackage}</p>
        <p><b>Price:</b> ${price}</p>
        <p><b>Details:</b> ${details}</p>
        
        <h3 style="color: #e53935;">👤 CLIENT INFORMATION</h3>
        <p><b>Full Name:</b> ${clientName}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Phone:</b> ${phone}</p>
        <p><b>Age:</b> ${age || 'Not provided'}</p>
        <p><b>Location:</b> ${location || 'Not specified'}</p>
        <p><b>Goal:</b> ${goal}</p>
        <p><b>Health Conditions:</b> ${healthConditions || 'None reported'}</p>
        <p><b>Notes:</b> ${notes || 'No additional notes'}</p>
      `;
    }

    // ✅ Send email to EP Fitness
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
        from: `"EP Fitness" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Thank you for contacting EP Fitness!",
        html: `
          <h2>Thank you for reaching out, ${name}!</h2>
          <p>We have received your message and will get back to you within <strong>24 hours</strong>.</p>
          <p>Coach Emman & EP Fitness Team</p>
        `
      });
    }

    if (formType === 'package') {
      const clientName = fullName || `${firstName || ''} ${lastName || ''}`.trim();
      
      await transporter.sendMail({
        from: `"EP Fitness" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Thank you for your EP Fitness package interest!",
        html: `
          <h2>Thanks for choosing EP Fitness, ${clientName}!</h2>
          <p><strong>Your Selected Package:</strong> ${selectedPackage}</p>
          <p><strong>Price:</strong> ${price}</p>
          <p>Coach Emman will contact you within <strong>24 hours</strong> with payment instructions.</p>
        `
      });
    }

    res.status(200).json({ 
      success: true, 
      message: "Form submitted successfully!" 
    });

  } catch (error) {
    console.error("📧 Email error:", error);
    res.status(500).json({ 
      error: "Failed to send email. Please try again or contact us directly at epfitness24@gmail.com" 
    });
  }
}
