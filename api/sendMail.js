// api/sendMail.js
import nodemailer from "nodemailer";

// Simple in-memory rate limiting (for production, use Redis or similar)
const rateLimit = new Map();
const RATE_LIMIT_WINDOW = 30 * 1000; // 30 seconds
const MAX_REQUESTS_PER_WINDOW = 3; // Max 3 requests per window

// Clean up old rate limit entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of rateLimit.entries()) {
    if (now - timestamp > RATE_LIMIT_WINDOW) {
      rateLimit.delete(key);
    }
  }
}, 60 * 60 * 1000);

// Validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate phone number (basic validation)
function isValidPhone(phone) {
  // Accepts various formats: +639123456789, 09123456789, 9123456789
  const phoneRegex = /^(\+?63|0)?[0-9]{10,12}$/;
  return phoneRegex.test(phone.replace(/\s+/g, ''));
}

// Check if honeypot field was filled (bot detection)
function isHoneypotFilled(honeypotValue) {
  return honeypotValue && honeypotValue.trim() !== '';
}

// Generate CSRF token for validation
function validateCsrfToken(token, sessionToken) {
  // In production, you'd validate against stored session token
  return token && token.length > 20;
}

// Check rate limit by IP
function checkRateLimit(ip) {
  const now = Date.now();
  const userRequests = rateLimit.get(ip) || [];
  
  // Filter requests within the window
  const recentRequests = userRequests.filter(time => now - time < RATE_LIMIT_WINDOW);
  
  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  
  // Add current request
  recentRequests.push(now);
  rateLimit.set(ip, recentRequests);
  return true;
}

// Sanitize input to prevent XSS
function sanitizeInput(input) {
  if (!input) return input;
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Recursively sanitize all string fields in an object
function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeInput(item) : item
      );
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export default async function handler(req, res) {
  // ✅ Allow only POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Get client IP for rate limiting
  const clientIp = req.headers['x-forwarded-for'] || 
                   req.connection.remoteAddress || 
                   'unknown';

  // Check rate limit
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ 
      error: "Too many requests. Please wait a few minutes before trying again." 
    });
  }

  const { 
    formType,
    // Bot protection fields
    website, // Honeypot
    contact_website,
    assessment_website,
    nutrition_website,
    csrfToken,
    timestamp,
    
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
    
    // Assessment form - Personal Information (original)
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
    commitmentDuringChallenges,
    
    // Nutrition Assessment Fields
    nutritionFullName,
    nutritionAge,
    nutritionGender,
    nutritionDateOfBirth,
    nutritionHeight,
    nutritionWeight,
    nutritionFiverrUsername,
    mealsPerDay,
    eatingPattern,
    specificDiet,
    fruitsVeggies,
    wholeGrains,
    leanProteins,
    dairy,
    processed,
    sugaryBeverages,
    eatOut,
    water,
    otherBeverages,
    beveragesSpecify,
    foodPreferences,
    dietaryRestrictions,
    restrictionsSpecify,
    barriers,
    barriersSpecify,
    mealPrepCommitment,
    mealPrepExplanation,
    nutritionGoals,
    nutritionExpectations
    
  } = req.body;

  try {
    // ========== BOT PROTECTION CHECKS ==========
    
    // 1. Check honeypot fields (should be empty for real users)
    const honeypotFields = [website, contact_website, assessment_website, nutrition_website];
    for (const field of honeypotFields) {
      if (isHoneypotFilled(field)) {
        console.log('Bot detected: honeypot field filled');
        // Return success to trick bot, but don't actually process
        return res.status(200).json({ 
          success: true, 
          message: "Form submitted successfully!" 
        });
      }
    }
    
    // 2. Validate CSRF token
    if (!validateCsrfToken(csrfToken)) {
      return res.status(403).json({ error: "Invalid security token. Please refresh the page and try again." });
    }
    
    // 3. Check timestamp (prevent replay attacks - form should be submitted within 1 hour)
    const submissionTime = parseInt(timestamp) || 0;
    const currentTime = Date.now();
    if (currentTime - submissionTime > 60 * 60 * 1000) { // 1 hour
      return res.status(400).json({ error: "Form expired. Please refresh and try again." });
    }
    
    // 4. Validate required fields based on form type
    if (formType === 'contact') {
      if (!name || !email || !service || !message) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      if (!isValidEmail(email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }
    }
    
    if (formType === 'package') {
      const clientName = fullName || `${firstName || ''} ${lastName || ''}`.trim();
      if (!clientName || !email || !goal) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      if (!isValidEmail(email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }
      if (phone && !isValidPhone(phone)) {
        return res.status(400).json({ error: "Invalid phone number format" });
      }
    }
    
    if (formType === 'assessment') {
      if (!assessmentFullName || !email || !phone) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      if (!isValidEmail(email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }
      if (!isValidPhone(phone)) {
        return res.status(400).json({ error: "Invalid phone number format" });
      }
    }
    
    if (formType === 'nutritionAssessment') {
      const clientName = nutritionFullName || assessmentFullName;
      if (!clientName || !email || !phone) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      if (!isValidEmail(email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }
      if (!isValidPhone(phone)) {
        return res.status(400).json({ error: "Invalid phone number format" });
      }
    }
    
    // ========== SANITIZE ALL INPUT ==========
    const sanitizedBody = sanitizeObject(req.body);
    
    // ========== EMAIL CONFIGURATION ==========
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
        <p><b>Name:</b> ${sanitizeInput(name)}</p>
        <p><b>Email:</b> ${sanitizeInput(email)}</p>
        <p><b>Phone:</b> ${sanitizeInput(phone || 'Not provided')}</p>
        <p><b>Service:</b> ${sanitizeInput(service)}</p>
        <p><b>Message:</b> ${sanitizeInput(message)}</p>
        <hr>
        <p><small>Submitted from IP: ${clientIp} at ${new Date().toLocaleString()}</small></p>
      `;
    } 
    
    // 📦 PACKAGE FORM EMAIL
    else if (formType === 'package') {
      const clientName = fullName || `${firstName || ''} ${lastName || ''}`.trim();
      
      emailSubject = `💪 New Package Sign-Up - EP Fitness`;
      emailHtml = `
        <h2>New Package Sign-Up Request</h2>
        <h3 style="color: #e53935;">📦 SELECTED PACKAGE</h3>
        <p><b>Package:</b> ${sanitizeInput(selectedPackage)}</p>
        <p><b>Price:</b> ${sanitizeInput(price)}</p>
        <p><b>Details:</b> ${sanitizeInput(details)}</p>
        
        <h3 style="color: #e53935;">👤 CLIENT INFORMATION</h3>
        <p><b>Full Name:</b> ${sanitizeInput(clientName)}</p>
        <p><b>Email:</b> ${sanitizeInput(email)}</p>
        <p><b>Phone:</b> ${sanitizeInput(phone)}</p>
        <p><b>Age:</b> ${sanitizeInput(age) || 'Not provided'}</p>
        <p><b>Location:</b> ${sanitizeInput(location) || 'Not specified'}</p>
        <p><b>Goal:</b> ${sanitizeInput(goal)}</p>
        <p><b>Health Conditions:</b> ${sanitizeInput(healthConditions) || 'None reported'}</p>
        <p><b>Notes:</b> ${sanitizeInput(notes) || 'No additional notes'}</p>
        <hr>
        <p><small>Submitted from IP: ${clientIp} at ${new Date().toLocaleString()}</small></p>
      `;
    }
    
    // 📋 ORIGINAL ASSESSMENT FORM EMAIL
    else if (formType === 'assessment') {
      emailSubject = `📋 New Client Assessment Form - EP Fitness`;
      
      // Format essentials checklist
      let essentialsList = '';
      if (essentials) {
        if (Array.isArray(essentials)) {
          essentialsList = essentials.map(e => sanitizeInput(e)).join(', ');
        } else {
          essentialsList = sanitizeInput(essentials);
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
              <div class="field"><span class="label">Full Name:</span> <span class="value">${sanitizeInput(assessmentFullName) || ''}</span></div>
              <div class="field"><span class="label">Email:</span> <span class="value">${sanitizeInput(email) || ''}</span></div>
              <div class="field"><span class="label">Phone:</span> <span class="value">${sanitizeInput(phone) || ''}</span></div>
              <div class="field"><span class="label">Gender:</span> <span class="value">${sanitizeInput(gender) || ''}</span></div>
              <div class="field"><span class="label">Date of Birth:</span> <span class="value">${sanitizeInput(dateOfBirth) || ''}</span></div>
              <div class="field"><span class="label">Age:</span> <span class="value">${sanitizeInput(assessmentAge) || ''}</span></div>
              <div class="field"><span class="label">Height:</span> <span class="value">${sanitizeInput(height) || ''}</span></div>
              <div class="field"><span class="label">Weight:</span> <span class="value">${sanitizeInput(weight) || ''}</span></div>
              <div class="field"><span class="label">Fiverr Username:</span> <span class="value">${sanitizeInput(fiverrUsername) || 'Not a Fiverr client'}</span></div>
            </div>
            
            <!-- LIFESTYLE INFORMATION -->
            <div class="section">
              <h3 class="section-title">🏃 LIFESTYLE INFORMATION</h3>
              <div class="field"><span class="label">Occupation:</span> <span class="value">${sanitizeInput(occupation) || ''}</span></div>
              <div class="field"><span class="label">Activity Level at Job:</span> <span class="value">${sanitizeInput(activityLevel) || ''}</span></div>
              <div class="field"><span class="label">Work Schedule:</span> <span class="value">${sanitizeInput(workSchedule) || ''}</span></div>
              <div class="field"><span class="label">Travel Frequency:</span> <span class="value">${sanitizeInput(travelFrequency) || ''}</span></div>
              <div class="field"><span class="label">Outside Physical Activities:</span> <span class="value">${sanitizeInput(outsideActivities) || 'None'}</span></div>
            </div>
            
            <!-- MEDICAL & HEALTH INFORMATION -->
            <div class="section">
              <h3 class="section-title">🏥 MEDICAL & HEALTH INFORMATION</h3>
              <div class="field"><span class="label">Diagnosed Health Conditions:</span> <span class="value">${sanitizeInput(diagnosedConditions) || 'None reported'}</span></div>
              <div class="field"><span class="label">Current Medications:</span> <span class="value">${sanitizeInput(medications) || 'None'}</span></div>
              <div class="field"><span class="label">Additional Therapies:</span> <span class="value">${sanitizeInput(conditionTherapies) || 'None'}</span></div>
              <div class="field"><span class="label">Existing Injuries/Conditions:</span> <span class="value">${sanitizeInput(existingInjuries) || 'None'}</span></div>
              <div class="field"><span class="label">Injury Therapies:</span> <span class="value">${sanitizeInput(injuryTherapies) || 'None'}</span></div>
              <div class="field"><span class="label">Stress/Motivational Problems:</span> <span class="value">${sanitizeInput(stressMotivation) || 'None'}</span></div>
              <div class="field"><span class="label">Family Heart Disease (under 60):</span> <span class="value">${sanitizeInput(familyHeartDisease) || ''}</span></div>
              <div class="field"><span class="label">Family Diseases:</span> <span class="value">${sanitizeInput(familyDiseases) || 'None'}</span></div>
              <div class="field"><span class="label">Chronic Conditions:</span> <span class="value">${sanitizeInput(chronicConditions) || 'None'}</span></div>
              <div class="field"><span class="label">Current Smoker:</span> <span class="value">${sanitizeInput(smoker) || ''}</span></div>
            </div>
            
            <!-- DIET INFORMATION -->
            <div class="section">
              <h3 class="section-title">🥗 DIET INFORMATION</h3>
              <div class="field"><span class="label">Current Diet:</span> <span class="value">${sanitizeInput(currentDiet) || ''}</span></div>
              <div class="field"><span class="label">Food Allergies/Intolerances:</span> <span class="value">${sanitizeInput(foodAllergies) || 'None'}</span></div>
              <div class="field"><span class="label">Favorite Foods:</span> <span class="value">${sanitizeInput(favoriteFoods) || ''}</span></div>
              <div class="field"><span class="label">Disliked Foods:</span> <span class="value">${sanitizeInput(dislikedFoods) || ''}</span></div>
              <div class="field"><span class="label">Past Diet Experiments:</span> <span class="value">${sanitizeInput(pastDiets) || 'None'}</span></div>
            </div>
            
            <!-- GOALS & TRAINING -->
            <div class="section">
              <h3 class="section-title">🎯 GOALS & TRAINING</h3>
              <div class="field"><span class="label">Fitness Level:</span> <span class="value">${sanitizeInput(fitnessLevel) || ''}</span></div>
              <div class="field"><span class="label">Compound Lifts (max weight):</span> <span class="value">${sanitizeInput(compoundLifts) || 'Not sure'}</span></div>
              <div class="field"><span class="label">Specific Goals (3-6 months):</span> <span class="value">${sanitizeInput(specificGoals) || ''}</span></div>
              <div class="field"><span class="label">Coach Expectations:</span> <span class="value">${sanitizeInput(coachExpectations) || ''}</span></div>
              <div class="field"><span class="label">Previous Attempts - What will be different?:</span> <span class="value">${sanitizeInput(previousAttempts) || ''}</span></div>
              <div class="field"><span class="label">Readiness for Change:</span> <span class="value">${sanitizeInput(readinessChange) || ''}</span></div>
              <div class="field"><span class="label">Goal Category:</span> <span class="value">${sanitizeInput(goalCategory) || ''}</span></div>
              <div class="field"><span class="label">Specific Training Goal:</span> <span class="value">${sanitizeInput(trainingGoal) || ''}</span></div>
              <div class="field"><span class="label">Gym Equipment Access:</span> <span class="value">${sanitizeInput(gymEquipment) || ''}</span></div>
              <div class="field"><span class="label">Essentials Available:</span> <span class="value">${essentialsList || 'None'}</span></div>
              <div class="field"><span class="label">Goal Timeline:</span> <span class="value">${sanitizeInput(goalTimeline) || ''}</span></div>
              <div class="field"><span class="label">Training Frequency (per week):</span> <span class="value">${sanitizeInput(trainingFrequency) || ''}</span></div>
              <div class="field"><span class="label">Motivation Level:</span> <span class="value">${sanitizeInput(motivationLevel) || ''}</span></div>
              <div class="field"><span class="label">Currently Exercising Regularly:</span> <span class="value">${sanitizeInput(currentlyExercising) || ''}</span></div>
              <div class="field"><span class="label">Trained with Personal Trainer Before:</span> <span class="value">${sanitizeInput(trainedBefore) || ''}</span></div>
              <div class="field"><span class="label">Previous Training Type:</span> <span class="value">${sanitizeInput(previousTrainingType) || 'N/A'}</span></div>
              <div class="field"><span class="label">Preferred Training Time:</span> <span class="value">${sanitizeInput(preferredTrainingTime) || ''}</span></div>
              <div class="field"><span class="label">Workout Duration:</span> <span class="value">${sanitizeInput(workoutDuration) || ''}</span></div>
              <div class="field"><span class="label">Personal Training Frequency (per week):</span> <span class="value">${sanitizeInput(personalTrainingFrequency) || ''}</span></div>
            </div>
            
            <!-- ABOUT YOU -->
            <div class="section">
              <h3 class="section-title">💭 ABOUT YOU</h3>
              <div class="field"><span class="label">Three Aspects About You:</span></div>
              <div class="value" style="white-space: pre-line; background: white; padding: 15px; border-radius: 5px;">${sanitizeInput(threeAspects) || ''}</div>
            </div>
            
            <!-- COMMITMENTS -->
            <div class="section">
              <h3 class="section-title">🤝 COMMITMENTS</h3>
              <div class="field"><span class="label">Weekly Check-in Commitment:</span> <span class="value">${sanitizeInput(weeklyCheckinCommitment) || ''}</span></div>
              <div class="field"><span class="label">Monthly Photos & Measurements Commitment:</span> <span class="value">${sanitizeInput(monthlyPhotosCommitment) || ''}</span></div>
              <div class="field"><span class="label">Commitment During Challenges:</span> <span class="value">${sanitizeInput(commitmentDuringChallenges) || ''}</span></div>
            </div>
            
            <hr>
            <p style="text-align: center; color: #666; font-size: 14px;">
              Assessment form submitted on ${new Date().toLocaleString()}<br>
              Client Email: ${sanitizeInput(email) || 'Not provided'}<br>
              Client Phone: ${sanitizeInput(phone) || 'Not provided'}<br>
              <small>IP: ${clientIp}</small>
            </p>
          </div>
        </body>
        </html>
      `;
    }
    
    // 🥗 NUTRITION ASSESSMENT FORM EMAIL
    else if (formType === 'nutritionAssessment') {
      emailSubject = `🥗 New Nutrition Assessment Form - EP Fitness (Coach EJ)`;
      
      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 800px; margin: 0 auto; background: white; }
            .header { background: #2e7d32; color: white; padding: 30px; text-align: center; }
            .section { background: #f9f9f9; padding: 25px; margin: 20px 0; border-radius: 10px; border-left: 5px solid #2e7d32; }
            .section-title { color: #2e7d32; margin-top: 0; border-bottom: 2px solid #2e7d32; padding-bottom: 10px; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #212121; }
            .value { margin-left: 20px; color: #555; }
            hr { border: 1px solid #ddd; margin: 30px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🥗 EP FITNESS - NUTRITION</h1>
              <h2>New Nutrition Assessment Form Submission</h2>
            </div>
            
            <!-- PART 1: PERSONAL INFORMATION -->
            <div class="section">
              <h3 class="section-title">📌 PART 1: PERSONAL INFORMATION</h3>
              <div class="field"><span class="label">Full Name:</span> <span class="value">${sanitizeInput(nutritionFullName || assessmentFullName) || ''}</span></div>
              <div class="field"><span class="label">Email:</span> <span class="value">${sanitizeInput(email) || ''}</span></div>
              <div class="field"><span class="label">Phone:</span> <span class="value">${sanitizeInput(phone) || ''}</span></div>
              <div class="field"><span class="label">Gender:</span> <span class="value">${sanitizeInput(nutritionGender || gender) || ''}</span></div>
              <div class="field"><span class="label">Date of Birth:</span> <span class="value">${sanitizeInput(nutritionDateOfBirth || dateOfBirth) || ''}</span></div>
              <div class="field"><span class="label">Age:</span> <span class="value">${sanitizeInput(nutritionAge || assessmentAge) || ''}</span></div>
              <div class="field"><span class="label">Height:</span> <span class="value">${sanitizeInput(nutritionHeight || height) || ''}</span></div>
              <div class="field"><span class="label">Weight:</span> <span class="value">${sanitizeInput(nutritionWeight || weight) || ''}</span></div>
              <div class="field"><span class="label">Fiverr Username:</span> <span class="value">${sanitizeInput(nutritionFiverrUsername || fiverrUsername) || 'Not a Fiverr client'}</span></div>
            </div>
            
            <!-- PART 2: LIFESTYLE INFORMATION -->
            <div class="section">
              <h3 class="section-title">🏃 PART 2: LIFESTYLE INFORMATION</h3>
              <div class="field"><span class="label">Occupation:</span> <span class="value">${sanitizeInput(occupation) || ''}</span></div>
              <div class="field"><span class="label">Activity Level at Job:</span> <span class="value">${sanitizeInput(activityLevel) || ''}</span></div>
              <div class="field"><span class="label">Work Schedule:</span> <span class="value">${sanitizeInput(workSchedule) || ''}</span></div>
              <div class="field"><span class="label">Travel Frequency:</span> <span class="value">${sanitizeInput(travelFrequency) || ''}</span></div>
              <div class="field"><span class="label">Outside Physical Activities:</span> <span class="value">${sanitizeInput(outsideActivities) || 'None'}</span></div>
            </div>
            
            <!-- PART 3: EATING HABITS -->
            <div class="section">
              <h3 class="section-title">🥗 PART 3: EATING HABITS</h3>
              <div class="field"><span class="label">Meals & Snacks per Day:</span> <span class="value">${sanitizeInput(mealsPerDay) || ''}</span></div>
              <div class="field"><span class="label">Typical Eating Pattern:</span> <span class="value">${sanitizeInput(eatingPattern) || ''}</span></div>
              <div class="field"><span class="label">Specific Diet:</span> <span class="value">${sanitizeInput(specificDiet) || ''}</span></div>
              
              <h4 style="color: #2e7d32; margin-top: 20px;">Food Frequency:</h4>
              <div class="field"><span class="label">Fruits & Vegetables:</span> <span class="value">${sanitizeInput(fruitsVeggies) || ''}</span></div>
              <div class="field"><span class="label">Whole Grains:</span> <span class="value">${sanitizeInput(wholeGrains) || ''}</span></div>
              <div class="field"><span class="label">Lean Proteins:</span> <span class="value">${sanitizeInput(leanProteins) || ''}</span></div>
              <div class="field"><span class="label">Dairy Products:</span> <span class="value">${sanitizeInput(dairy) || ''}</span></div>
              <div class="field"><span class="label">Processed Foods:</span> <span class="value">${sanitizeInput(processed) || ''}</span></div>
              <div class="field"><span class="label">Sugary Beverages:</span> <span class="value">${sanitizeInput(sugaryBeverages) || ''}</span></div>
              
              <div class="field"><span class="label">Eat Out/Takeout Frequency:</span> <span class="value">${sanitizeInput(eatOut) || ''}</span></div>
            </div>
            
            <!-- PART 4: HYDRATION -->
            <div class="section">
              <h3 class="section-title">💧 PART 4: HYDRATION</h3>
              <div class="field"><span class="label">Daily Water Intake:</span> <span class="value">${sanitizeInput(water) || ''}</span></div>
              <div class="field"><span class="label">Other Beverages:</span> <span class="value">${sanitizeInput(otherBeverages) || ''}</span></div>
              <div class="field"><span class="label">Beverages Details:</span> <span class="value">${sanitizeInput(beveragesSpecify) || 'N/A'}</span></div>
              <div class="field"><span class="label">Past Diet Experiments:</span> <span class="value">${sanitizeInput(pastDiets) || 'None'}</span></div>
            </div>
            
            <!-- PART 5: PREFERENCES & BARRIERS -->
            <div class="section">
              <h3 class="section-title">🎯 PART 5: PREFERENCES & BARRIERS</h3>
              <div class="field"><span class="label">Food Preferences (Enjoy/Dislike):</span> <span class="value">${sanitizeInput(foodPreferences) || ''}</span></div>
              <div class="field"><span class="label">Dietary Restrictions:</span> <span class="value">${sanitizeInput(dietaryRestrictions) || ''}</span></div>
              <div class="field"><span class="label">Restrictions Details:</span> <span class="value">${sanitizeInput(restrictionsSpecify) || 'N/A'}</span></div>
              <div class="field"><span class="label">Barriers to Healthy Diet:</span> <span class="value">${sanitizeInput(barriers) || ''}</span></div>
              <div class="field"><span class="label">Barriers Details:</span> <span class="value">${sanitizeInput(barriersSpecify) || 'N/A'}</span></div>
            </div>
            
            <!-- PART 6: GOALS AND EXPECTATIONS -->
            <div class="section">
              <h3 class="section-title">🌟 PART 6: GOALS AND EXPECTATIONS</h3>
              <div class="field"><span class="label">Meal Prep Commitment (1-10):</span> <span class="value">${sanitizeInput(mealPrepCommitment) || ''}</span></div>
              <div class="field"><span class="label">Meal Prep Explanation:</span> <span class="value">${sanitizeInput(mealPrepExplanation) || ''}</span></div>
              <div class="field"><span class="label">Short-term & Long-term Goals:</span></div>
              <div class="value" style="white-space: pre-line; background: white; padding: 15px; border-radius: 5px; margin-top: 5px;">${sanitizeInput(nutritionGoals) || ''}</div>
              
              <div class="field" style="margin-top: 20px;"><span class="label">Expectations from Nutrition Plan:</span></div>
              <div class="value" style="white-space: pre-line; background: white; padding: 15px; border-radius: 5px; margin-top: 5px;">${sanitizeInput(nutritionExpectations) || ''}</div>
            </div>
            
            <!-- SELECTED PACKAGE -->
            ${selectedPackage ? `
            <div class="section">
              <h3 class="section-title">📦 SELECTED PACKAGE</h3>
              <div class="field"><span class="label">Package:</span> <span class="value">${sanitizeInput(selectedPackage)}</span></div>
              <div class="field"><span class="label">Price:</span> <span class="value">${sanitizeInput(price)}</span></div>
            </div>
            ` : ''}
            
            <hr>
            <p style="text-align: center; color: #666; font-size: 14px;">
              Nutrition assessment form submitted on ${new Date().toLocaleString()}<br>
              Client Email: ${sanitizeInput(email) || 'Not provided'}<br>
              Client Phone: ${sanitizeInput(phone) || 'Not provided'}<br>
              <small>IP: ${clientIp}</small>
            </p>
          </div>
        </body>
        </html>
      `;
    }

    // ✅ Send email to EP Fitness
    await transporter.sendMail({
      from: `"EP Fitness Website" <${process.env.EMAIL_USER}>`,
      to: formType === 'nutritionAssessment' ? "ejukulele@gmail.com, epfitness24@gmail.com" : "epfitness24@gmail.com",
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
          <h2>Thank you for reaching out, ${sanitizeInput(name)}!</h2>
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
          <h2>Thanks for choosing EP Fitness, ${sanitizeInput(clientName)}!</h2>
          <p><strong>Your Selected Package:</strong> ${sanitizeInput(selectedPackage)}</p>
          <p><strong>Price:</strong> ${sanitizeInput(price)}</p>
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
              <h2 style="color: #212121;">Thank you for completing your assessment, ${sanitizeInput(assessmentFullName)}!</h2>
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
    
    if (formType === 'nutritionAssessment') {
      await transporter.sendMail({
        from: `"EP Fitness Nutrition" <${process.env.EMAIL_USER}>`,
        to: email || nutritionFullName,
        subject: "✅ Your EP Fitness Nutrition Assessment has been received!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #2e7d32; color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0;">🥗 EP FITNESS NUTRITION</h1>
            </div>
            <div style="padding: 30px;">
              <h2 style="color: #212121;">Thank you for completing your nutrition assessment, ${sanitizeInput(nutritionFullName || assessmentFullName)}!</h2>
              <p style="font-size: 16px;">Coach EJ has received your detailed nutrition assessment form and will review it within <strong style="color: #2e7d32;">24-48 hours</strong>.</p>
              
              <div style="background: #f5f5f5; padding: 25px; border-radius: 10px; margin: 30px 0; border-left: 5px solid #2e7d32;">
                <h3 style="color: #2e7d32; margin-top: 0;">📋 What happens next?</h3>
                <ol style="margin-bottom: 0;">
                  <li style="margin-bottom: 10px;">Coach EJ will review your nutrition assessment</li>
                  <li style="margin-bottom: 10px;">He will prepare a personalized nutrition plan based on your goals and preferences</li>
                  <li style="margin-bottom: 10px;">You will receive an email within 48 hours to schedule your first consultation</li>
                  <li style="margin-bottom: 0;">We'll begin your nutrition journey! 💪</li>
                </ol>
              </div>
              
              <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px;">
                📞 Questions? Call Coach EJ: +63-906-333-1003<br>
                ✉️ Email: ejukulele@gmail.com
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
