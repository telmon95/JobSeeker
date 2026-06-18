import React from 'react';

const ProblemSolution: React.FC = () => (
  <section className="problem-solution glass-card">
    <div className="problem-solution__grid">
      <div>
        <p className="problem-solution__label">The problem</p>
        <h2>Job hunting was fragmented and low-signal.</h2>
        <ul>
          <li>Manual search across multiple job boards</li>
          <li>No clear match between your CV and each role</li>
          <li>Pipeline failures from bad location data (e.g. suburb names APIs reject)</li>
          <li>Match scores stuck near 7% due to noisy skill parsing</li>
        </ul>
      </div>
      <div>
        <p className="problem-solution__label problem-solution__label--fix">The solution</p>
        <h2>One continuous flow: CV → search → rank → apply.</h2>
        <ul>
          <li>Upload CV once — LlamaParse extracts skills & experience</li>
          <li>Auto-search Google Jobs + Adzuna with normalized locations</li>
          <li>Multi-factor match scoring (skills, title, location, experience)</li>
          <li>Filter by work type, match %, and apply on the original site</li>
        </ul>
      </div>
    </div>
  </section>
);

export default ProblemSolution;
