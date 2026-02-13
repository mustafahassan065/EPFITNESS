// api/sendMail.js
import nodemailer from "nodemailer";

export default async function handler(req, res) {
  // ✅ Allow only POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { 
    formType,
    // Contact form
    name, 
    email, 
    phone, 
    service, 
    message,
    
    // Package form
    firstName, 
    lastName, 
    fullName,
    age,
    location,
    goal,
    healthConditions,
    notes,
    package: selectedPackage,
    price,
    details,
    
    // Assessment form - Personal Information
    assessmentFullName,
    gender,
    dateOfBirth,
    assessmentAge,
    height,
    weight,
    fiverrUsername,
    
    // Lifestyle Information
    occupation,
    activityLevel,
    workSchedule,
    travelFrequency,
    outsideActivities,
    
    // Medical & Health
    diagnosedConditions,
    medications,
    conditionTherapies,
    existingInjuries,
    injuryTherapies,
    stressMotivation,
    familyHeartDisease,
    familyDiseases,
    chronicConditions,
    smoker,
    
    // Diet Information
    currentDiet,
    foodAllergies,
    favoriteFoods,
    dislikedFoods,
    pastDiets,
    
    // Goals & Training
    fitnessLevel,
    compoundLifts,
    specificGoals,
    coachExpectations,
    previousAttempts,
    readinessChange,
    goalCategory,
    trainingGoal,
    gymEquipment,
    essentials,
    goalTimeline,
    trainingFrequency,
    motivationLevel,
    currentlyExercising,
    trainedBefore,
    previousTrainingType,
    preferredTrainingTime,
    workoutDuration,
    personalTrainingFrequency,
    
    // About You
    threeAspects,
    
    // Commitments
    weeklyCheckinCommitment,
    monthlyPhotosCommitment,
    commitmentDuringChallenges
    
  } = req.body;

  try {
    // ✅ Gmail SMTP configuration
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
    
    // 📋 ASSESSMENT FORM EMAIL
    else if (formType === 'assessment') {
      emailSubject = `📋 New Client Assessment Form - EP Fitness`;
      
      // Format essentials checklist
      let essentialsList = '';
      if (essentials) {
        if (Array.isArray(essentials)) {
          essentialsList = essentials.join(', ');
        } else {
          essentialsList = essentials;
        }
      }
      
      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 800px; margin: 0 auto; background: white; }
            .header { background: #e53935; color: white; padding: 30px; text-align: center; }
            .section { background: #f9f9f9; padding: 25px; margin: 20px 0; border-radius: 10px; border-left: 5px solid #e53935; }
            .section-title { color: #e53935; margin-top: 0; border-bottom: 2px solid #e53935; padding-bottom: 10px; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #212121; }
            .value { margin-left: 20px; color: #555; }
            hr { border: 1px solid #ddd; margin: 30px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏋️ EP FITNESS</h1>
              <h2>New Client Assessment Form Submission</h2>
            </div>
            
            <!-- PERSONAL INFORMATION -->
            <div class="section">
              <h3 class="section-title">📌 PERSONAL INFORMATION</h3>
              <div class="field"><span class="label">Full Name:</span> <span class="value">${assessmentFullName || ''}</span></div>
              <div class="field"><span class="label">Gender:</span> <span class="value">${gender || ''}</span></div>
              <div class="field"><span class="label">Date of Birth:</span> <span class="value">${dateOfBirth || ''}</span></div>
              <div class="field"><span class="label">Age:</span> <span class="value">${assessmentAge || ''}</span></div>
              <div class="field"><span class="label">Height:</span> <span class="value">${height || ''}</span></div>
              <div class="field"><span class="label">Weight:</span> <span class="value">${weight || ''}</span></div>
              <div class="field"><span class="label">Fiverr Username:</span> <span class="value">${fiverrUsername || 'Not a Fiverr client'}</span></div>
            </div>
            
            <!-- LIFESTYLE INFORMATION -->
            <div class="section">
              <h3 class="section-title">🏃 LIFESTYLE INFORMATION</h3>
              <div class="field"><span class="label">Occupation:</span> <span class="value">${occupation || ''}</span></div>
              <div class="field"><span class="label">Activity Level at Job:</span> <span class="value">${activityLevel || ''}</span></div>
              <div class="field"><span class="label">Work Schedule:</span> <span class="value">${workSchedule || ''}</span></div>
              <div class="field"><span class="label">Travel Frequency:</span> <span class="value">${travelFrequency || ''}</span></div>
              <div class="field"><span class="label">Outside Physical Activities:</span> <span class="value">${outsideActivities || 'None'}</span></div>
            </div>
            
            <!-- MEDICAL & HEALTH INFORMATION -->
            <div class="section">
              <h3 class="section-title">🏥 MEDICAL & HEALTH INFORMATION</h3>
              <div class="field"><span class="label">Diagnosed Health Conditions:</span> <span class="value">${diagnosedConditions || 'None reported'}</span></div>
              <div class="field"><span class="label">Current Medications:</span> <span class="value">${medications || 'None'}</span></div>
              <div class="field"><span class="label">Additional Therapies:</span> <span class="value">${conditionTherapies || 'None'}</span></div>
              <div class="field"><span class="label">Existing Injuries/Conditions:</span> <span class="value">${existingInjuries || 'None'}</span></div>
              <div class="field"><span class="label">Injury Therapies:</span> <span class="value">${injuryTherapies || 'None'}</span></div>
              <div class="field"><span class="label">Stress/Motivational Problems:</span> <span class="value">${stressMotivation || 'None'}</span></div>
              <div class="field"><span class="label">Family Heart Disease (under 60):</span> <span class="value">${familyHeartDisease || ''}</span></div>
              <div class="field"><span class="label">Family Diseases:</span> <span class="value">${familyDiseases || 'None'}</span></div>
              <div class="field"><span class="label">Chronic Conditions:</span> <span class="value">${chronicConditions || 'None'}</span></div>
              <div class="field"><span class="label">Current Smoker:</span> <span class="value">${smoker || ''}</span></div>
            </div>
            
            <!-- DIET INFORMATION -->
            <div class="section">
              <h3 class="section-title">🥗 DIET INFORMATION</h3>
              <div class="field"><span class="label">Current Diet:</span> <span class="value">${currentDiet || ''}</span></div>
              <div class="field"><span class="label">Food Allergies/Intolerances:</span> <span class="value">${foodAllergies || 'None'}</span></div>
              <div class="field"><span class="label">Favorite Foods:</span> <span class="value">${favoriteFoods || ''}</span></div>
              <div class="field"><span class="label">Disliked Foods:</span> <span class="value">${dislikedFoods || ''}</span></div>
              <div class="field"><span class="label">Past Diet Experiments:</span> <span class="value">${pastDiets || 'None'}</span></div>
            </div>
            
            <!-- GOALS & TRAINING -->
            <div class="section">
              <h3 class="section-title">🎯 GOALS & TRAINING</h3>
              <div class="field"><span class="label">Fitness Level:</span> <span class="value">${fitnessLevel || ''}</span></div>
              <div class="field"><span class="label">Compound Lifts (max weight):</span> <span class="value">${compoundLifts || 'Not sure'}</span></div>
              <div class="field"><span class="label">Specific Goals (3-6 months):</span> <span class="value">${specificGoals || ''}</span></div>
              <div class="field"><span class="label">Coach Expectations:</span> <span class="value">${coachExpectations || ''}</span></div>
              <div class="field"><span class="label">Previous Attempts - What will be different?:</span> <span class="value">${previousAttempts || ''}</span></div>
              <div class="field"><span class="label">Readiness for Change:</span> <span class="value">${readinessChange || ''}</span></div>
              <div class="field"><span class="label">Goal Category:</span> <span class="value">${goalCategory || ''}</span></div>
              <div class="field"><span class="label">Specific Training Goal:</span> <span class="value">${trainingGoal || ''}</span></div>
              <div class="field"><span class="label">Gym Equipment Access:</span> <span class="value">${gymEquipment || ''}</span></div>
              <div class="field"><span class="label">Essentials Available:</span> <span class="value">${essentialsList || 'None'}</span></div>
              <div class="field"><span class="label">Goal Timeline:</span> <span class="value">${goalTimeline || ''}</span></div>
              <div class="field"><span class="label">Training Frequency (per week):</span> <span class="value">${trainingFrequency || ''}</span></div>
              <div class="field"><span class="label">Motivation Level:</span> <span class="value">${motivationLevel || ''}</span></div>
              <div class="field"><span class="label">Currently Exercising Regularly:</span> <span class="value">${currentlyExercising || ''}</span></div>
              <div class="field"><span class="label">Trained with Personal Trainer Before:</span> <span class="value">${trainedBefore || ''}</span></div>
              <div class="field"><span class="label">Previous Training Type:</span> <span class="value">${previousTrainingType || 'N/A'}</span></div>
              <div class="field"><span class="label">Preferred Training Time:</span> <span class="value">${preferredTrainingTime || ''}</span></div>
              <div class="field"><span class="label">Workout Duration:</span> <span class="value">${workoutDuration || ''}</span></div>
              <div class="field"><span class="label">Personal Training Frequency (per week):</span> <span class="value">${personalTrainingFrequency || ''}</span></div>
            </div>
            
            <!-- ABOUT YOU -->
            <div class="section">
              <h3 class="section-title">💭 ABOUT YOU</h3>
              <div class="field"><span class="label">Three Aspects About You:</span></div>
              <div class="value" style="white-space: pre-line; background: white; padding: 15px; border-radius: 5px;">${threeAspects || ''}</div>
            </div>
            
            <!-- COMMITMENTS -->
            <div class="section">
              <h3 class="section-title">🤝 COMMITMENTS</h3>
              <div class="field"><span class="label">Weekly Check-in Commitment:</span> <span class="value">${weeklyCheckinCommitment || ''}</span></div>
              <div class="field"><span class="label">Monthly Photos & Measurements Commitment:</span> <span class="value">${monthlyPhotosCommitment || ''}</span></div>
              <div class="field"><span class="label">Commitment During Challenges:</span> <span class="value">${commitmentDuringChallenges || ''}</span></div>
            </div>
            
            <hr>
            <p style="text-align: center; color: #666; font-size: 14px;">
              Assessment form submitted on ${new Date().toLocaleString()}<br>
              Client Email: ${email || 'Not provided'}<br>
              Client Phone: ${phone || 'Not provided'}
            </p>
          </div>
        </body>
        </html>
      `;
    }

    // ✅ Send email to EP Fitness
    await transporter.sendMail({
      from: `"EP Fitness Website" <${process.env.EMAIL_USER}>`,
      to: "epfitness24@gmail.com",
      replyTo: email || (formType === 'assessment' ? assessmentFullName : ''),
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

    if (formType === 'assessment') {
      await transporter.sendMail({
        from: `"EP Fitness" <${process.env.EMAIL_USER}>`,
        to: email || assessmentFullName,
        subject: "✅ Your EP Fitness Assessment Form has been received!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #e53935; color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0;">🏋️ EP FITNESS</h1>
            </div>
            <div style="padding: 30px;">
              <h2 style="color: #212121;">Thank you for completing your assessment, ${assessmentFullName}!</h2>
              <p style="font-size: 16px;">Coach Emman has received your detailed assessment form and will review it within <strong style="color: #e53935;">24-48 hours</strong>.</p>
              
              <div style="background: #f5f5f5; padding: 25px; border-radius: 10px; margin: 30px 0; border-left: 5px solid #e53935;">
                <h3 style="color: #e53935; margin-top: 0;">📋 What happens next?</h3>
                <ol style="margin-bottom: 0;">
                  <li style="margin-bottom: 10px;">Coach Emman will review your assessment</li>
                  <li style="margin-bottom: 10px;">He will prepare a personalized training plan based on your goals</li>
                  <li style="margin-bottom: 10px;">You will receive an email within 48 hours to schedule your first session</li>
                  <li style="margin-bottom: 0;">We'll begin your transformation journey! 💪</li>
                </ol>
              </div>
              
              <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px;">
                📞 Questions? Call Coach Emman: +63-906-279-6854<br>
                ✉️ Email: epfitness24@gmail.com
              </p>
            </div>
          </div>
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
