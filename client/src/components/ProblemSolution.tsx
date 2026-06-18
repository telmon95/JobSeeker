import React from 'react';

const PROBLEM_ITEMS = [
  'Opportunities are spread across multiple job boards and company websites.',
  'Job seekers spend hours searching for roles that aren\u2019t a good fit.',
  'Applications are submitted without knowing how well a CV matches the role.',
  'Location and keyword inconsistencies can hide relevant opportunities.',
  'Career changers and graduates struggle to identify where they fit in the market.',
];

const SOLUTION_FEATURES = [
  {
    title: 'AI-Powered CV Analysis',
    body: 'Upload your CV once. JobSeeker extracts your skills, experience, education, certifications, and career history automatically.',
  },
  {
    title: 'Intelligent Job Matching',
    body: 'Searches live job opportunities from multiple sources and identifies the roles most relevant to your profile.',
  },
  {
    title: 'Smart Match Scores',
    body: 'Every job is ranked using skills alignment, experience level, job title relevance, location compatibility, and industry fit.',
  },
  {
    title: 'Identify Skill Gaps',
    body: 'See which qualifications or skills are missing and understand how to improve your chances for future opportunities.',
  },
  {
    title: 'Personalized Applications',
    body: 'Generate tailored cover letters and application content in seconds.',
  },
  {
    title: 'Application Tracking',
    body: 'Save jobs, monitor applications, and manage your job search from a single dashboard.',
  },
];

const AUDIENCE_ITEMS = [
  'Graduates and entry-level job seekers',
  'Software developers and IT professionals',
  'Healthcare professionals',
  'Sales and marketing professionals',
  'Skilled trades and technical workers',
  'Career changers',
  'Experienced professionals seeking new opportunities',
];

const ProblemSolution: React.FC = () => (
  <div className="careers-marketing">
    <section className="problem-solution glass-card">
      <div className="problem-solution__grid">
        <div>
          <p className="problem-solution__label">The Problem</p>
          <h2>Finding the right job is often time-consuming and frustrating.</h2>
          <ul>
            {PROBLEM_ITEMS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="problem-solution__label problem-solution__label--fix">The Solution</p>
          <h2>A smarter path from CV to career.</h2>
          <p className="careers-marketing__workflow">
            <strong>Upload CV</strong>
            <span aria-hidden="true">→</span>
            <strong>Discover Jobs</strong>
            <span aria-hidden="true">→</span>
            <strong>Match &amp; Rank</strong>
            <span aria-hidden="true">→</span>
            <strong>Apply</strong>
          </p>
          <p className="careers-marketing__lead">
            JobSeeker creates one seamless workflow from your CV to your next role.
          </p>
        </div>
      </div>
    </section>

    <section className="careers-features glass-card">
      <div className="careers-features__grid">
        {SOLUTION_FEATURES.map((feature) => (
          <article key={feature.title} className="careers-feature">
            <h3>{feature.title}</h3>
            <p>{feature.body}</p>
          </article>
        ))}
      </div>
    </section>

    <section className="careers-audience glass-card">
      <p className="problem-solution__label">Who It&apos;s For</p>
      <h2>Built for every stage of your career.</h2>
      <ul className="careers-audience__list">
        {AUDIENCE_ITEMS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>

    <section className="careers-mission glass-card">
      <p className="problem-solution__label problem-solution__label--fix">Our Mission</p>
      <h2>To make career opportunities more accessible.</h2>
      <p>
        We help people discover jobs that truly match their skills, experience, and ambitions.
        Whether you&apos;re looking for your first job, changing careers, or taking the next step in
        your profession, JobSeeker helps you search smarter and apply with confidence.
      </p>
    </section>
  </div>
);

export default ProblemSolution;
