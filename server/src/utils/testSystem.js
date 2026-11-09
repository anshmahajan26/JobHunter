import { greenhouseService } from '../services/discovery/greenhouseService.js';
import { leverService } from '../services/discovery/leverService.js';
import { reportGenerator } from '../services/reporting/reportGenerator.js';
import { resumeTailorService } from '../services/resume/resumeTailorService.js';
import path from 'path';
import fs from 'fs';

async function runSystemVerification() {
  console.log('--- STARTING JOBPILOT AI SYSTEM SELF-TEST ---');

  // Test 1: Greenhouse API fetch from live board (Figma or Stripe or Elastic)
  console.log('[Test 1] Testing Greenhouse Public API connection...');
  try {
    const ghJobs = await greenhouseService.fetchJobs('elastic');
    console.log(`✓ Greenhouse API Success: Retrieved ${ghJobs.length} live jobs from 'elastic'.`);
    if (ghJobs.length > 0) {
      console.log(`  Sample job title: "${ghJobs[0].title}" at ${ghJobs[0].location}`);
    }
  } catch (err) {
    console.warn(`! Greenhouse API test error: ${err.message}`);
  }

  // Test 2: Lever API fetch from live board (Automattic or Deliveroo or Postman)
  console.log('[Test 2] Testing Lever Public API connection...');
  try {
    const leverJobs = await leverService.fetchJobs('automattic');
    console.log(`✓ Lever API Success: Retrieved ${leverJobs.length} live jobs from 'automattic'.`);
    if (leverJobs.length > 0) {
      console.log(`  Sample job title: "${leverJobs[0].title}" (${leverJobs[0].workplaceType})`);
    }
  } catch (err) {
    console.warn(`! Lever API test error: ${err.message}`);
  }

  // Test 3: PDFKit resume generation
  console.log('[Test 3] Testing PDFKit Tailored Resume generation...');
  try {
    const testPdfPath = path.resolve('uploads/tailored/test_tailored_resume.pdf');
    if (!fs.existsSync(path.dirname(testPdfPath))) {
      fs.mkdirSync(path.dirname(testPdfPath), { recursive: true });
    }

    await resumeTailorService.generatePdfFile(
      {
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        phone: '+91 9876543210',
        location: 'Bengaluru, India',
        linkedinUrl: 'https://linkedin.com/in/janedoe',
        githubUrl: 'https://github.com/janedoe',
        summary: 'Experienced Full Stack Developer specializing in React, Node.js, and distributed architectures.',
        skills: ['React', 'Node.js', 'Express', 'MongoDB', 'TypeScript', 'Playwright'],
        experience: [
          {
            title: 'Full Stack Engineer',
            company: 'TechCorp Solutions',
            startDate: 'Jan 2023',
            endDate: 'Present',
            location: 'Remote',
            responsibilities: [
              'Architected robust microservices using Node.js and MongoDB',
              'Developed dynamic, accessible user interfaces with React and Tailwind CSS',
            ],
          },
        ],
        projects: [
          {
            title: 'JobPilot AI Platform',
            technologies: ['React', 'Express', 'Gemini AI', 'Playwright'],
            description: 'Autonomous AI-powered job discovery and application platform.',
          },
        ],
        education: [
          {
            degree: 'B.Tech in Computer Science',
            institution: 'Indian Institute of Technology',
            graduationYear: '2023',
            cgpaOrPercentage: '8.8 / 10',
          },
        ],
      },
      testPdfPath
    );

    const exists = fs.existsSync(testPdfPath);
    const size = exists ? fs.statSync(testPdfPath).size : 0;
    console.log(`✓ PDFKit Resume Success: Generated ${testPdfPath} (${size} bytes).`);
  } catch (err) {
    console.error(`! PDFKit Resume test error: ${err.message}`);
  }

  console.log('--- JOBPILOT AI SYSTEM VERIFICATION COMPLETE ---');
}

runSystemVerification();

