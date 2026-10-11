---
title: "Automating Partner File Access: A Self-Service Client Portal Cutting Manual Work by 12%"
hero: "https://framerusercontent.com/images/puy76mmYVruaGGmEU1y4u8YgrQ4.png?width=2882&height=1525"
meta:
  - { label: Product, value: B2B web app }
  - { label: Skills, value: "Product design, Stakeholder management, User research & testing" }
  - { label: Role, value: Product Designer }
  - { label: Team, value: "UX Team, Operation Team, Development Team, and other Program Team directors" }
toc:
  - { label: Overview, id: overview }
  - { label: Outcome, id: outcome }
  - { label: Context, id: context }
  - { label: Process, id: process }
  - { label: Final Design, id: final-design }
  - { label: Reflection, id: reflection }
next:
  slug: home-page-redesign
  eyebrow: "Ding-go | BLIVE GLOBAL, LLC"
  title: "Mobile-First Homepage Redesign with AI-Accelerated Deployment: +52% Add-to-Cart Rate"
  tags: [B2C, E-Commerce, AI Dev Tools]
---

## Outcome

<div class="metrics">
  <div><b data-count="12" data-suffix="%">12%</b><span>Manual User Provisioning Reduced</span></div>
  <div><b data-count="34" data-suffix="%">34%</b><span>Task Completion Time Reduced</span></div>
  <div><b data-count="80" data-suffix="%">80%</b><span>Key Feature Adoption Rate</span></div>
</div>

### What's Primary Care Coalition?

Primary Care Coalition (PCC) is a Maryland nonprofit that improves healthcare access for underserved residents of Montgomery County through programs like Montgomery Cares and Care for Kids. It supports a network of partner clinics, hospitals, and funders, which means constantly exchanging files and data with external partners, the workflow this project set out to improve.

![](https://framerusercontent.com/images/02HwiEQlz83dLWHXNPQgr7Q9Kq4.png?width=1454&height=536)

## Context

<div class="cards">
  <div><h5>❓ Problem to Solve</h5><p>Insurance and program coordinators spent hours every week manually managing access and chasing files, and external partners regularly overwrote critical data.</p></div>
  <div><h5>🪨 Unique Challenge</h5><p>Integrate within existing SharePoint ecosystem while complying with HIPAA and other healthcare data access regulations.</p></div>
  <div><h5>📍 Project Goal</h5><p>Build a tool that enables healthcare workers to exchange healthcare files and data within regulatory compliance, with minimal manual work and licensing cost.</p></div>
  <div><h5>📈 Business Needs</h5><p><strong>As PCC's partner network grew, they needed a secure, cost-effective way to keep file exchange efficient without scaling up manual admin work.</strong></p></div>
</div>

## Process

### Research: Identifying the Access Problem

I conduct 6 stakeholder interviews across Operations and 5 Program teams, which revealed 2 persona and 3 main pain points for the current workflow:

<div class="cards">
  <div>
    <span class="eyebrow">Target User 1</span>
    <h5>Program Coordinator (Internal Staff)</h5>
    <img src="https://framerusercontent.com/images/bqnHhR7rYyZkWe476k4ok5Rju0A.png?width=624&height=624" alt="" style="width:96px;border-radius:50%;box-shadow:none;margin:8px 0 12px" loading="lazy" />
    <p><strong>Task</strong><br />Send files to partners, collect their data, and update internal records</p>
  </div>
  <div>
    <span class="eyebrow">Target User 2</span>
    <h5>Hospital Staff (External Partner)</h5>
    <img src="https://framerusercontent.com/images/O54ij97qmAGDJBeEbazUA9Yk.png?width=624&height=624" alt="" style="width:96px;border-radius:50%;box-shadow:none;margin:8px 0 12px" loading="lazy" />
    <p><strong>Task</strong><br />Request PCC data for administrative filings and return files</p>
  </div>
</div>

#### Research Insights

<div class="cards three">
  <div><h5>1. Manual links drain staff time</h5><p>Internal staff spend hours emailing hand-made access links that partners lose in their inboxes.</p></div>
  <div><h5>2. Default security locks partners out.</h5><p>SharePoint's private-environment settings frequently block external partners from reaching their files.</p></div>
  <div><h5>3. No data isolation puts files at risk.</h5><p>Without strict separation, partners accidentally overwrite critical documents and break version control.</p></div>
</div>

### Ideation: An Automated Shared Space

I proposed building a shared space as client portal, replacing manual link creation with a persistent, permission-based area partners could return to.

![](https://framerusercontent.com/images/YfwtxNiWP6nvHQgCnWKhUCWQs.png?width=1858&height=1211)

### Finding the Middle Ground Within Constraints

I proposed a third-party portal for full flexibility, but healthcare data regulations required SharePoint unless we built a compliant data center. After exploring alternatives with the operations and development teams, I pivoted to an MVP using SharePoint's supported features, while development evaluates a new platform for the next launch.

![](https://framerusercontent.com/images/Qgv6OQt4CUaFfKQyvqgcfRN8lk.png?width=1575&height=772)

### Placing the Shared Space Within Healthcare Data Constraints

Initially we planned to put the centralized hub inside PCC's internal SharePoint structure, but the need to limit healthcare data access permissions led us to work with stakeholders and pivot the scope to a separate, secure portal focused solely on external partner access.

![](https://framerusercontent.com/images/diTIwvtewLxsk28aRhKUnvAYfLc.png?width=1822&height=900)

### Designing the Information Architecture

I designed a central portal that surfaces public files first, then routes each partner to their own isolated site for partner-specific data, more setup upfront, but far less maintenance, and it closes the manual-access gap research uncovered.

<div class="pair">
  <img src="https://framerusercontent.com/images/4fwvdibNlKz6bzrr3T6O2Y7sxU.png?width=833&height=1075" alt="" loading="lazy" />
  <img src="https://framerusercontent.com/images/cSWjHHnSH2GhI3TZVbaK8FpqV0.png?width=802&height=1075" alt="" loading="lazy" />
</div>

### Organizing Menu by Task, Not Department

For the internal staff view, I chose to organize menu items by task type, like "Central Distribution" and "Master Inbox", rather than by internal department structure.

![](https://framerusercontent.com/images/6ReAD1qFpftMVOo2vkEJeEGQ2ns.png?width=1701&height=926)

### User Testing and Iteration

I built mid-fidelity Figma wireframes, used Claude to make them clickable, and ran 5 moderated usability sessions with internal healthcare staff, iterating on the design and validating the concept with the legal team before handoff.

#### Finding 1: The Portal Entrance Needed Role-Based Views to Prevent Cross-Partner Exposure

![](https://framerusercontent.com/images/vQ02lZIBL96qStB9fNKrUBiaCtE.png?width=2057&height=1013)

![](https://framerusercontent.com/images/txBhon0Pt0ukjDRMfgDQbDFJw8g.png?width=2057&height=1013)

#### Finding 2: Program Managers wanted self-serve subfolder structures instead of one-size-fits-all sections

![](https://framerusercontent.com/images/xDqMdFHKTipcbP8mtj1IZxqlKA.png?width=2057&height=803)

![](https://framerusercontent.com/images/T9CzmXMgRKPPEwhFqJ3taHVh97I.png?width=2057&height=803)

## Final Design

### Final Design: A Centralized Client Portal

![](https://framerusercontent.com/images/H6iHBLyWVFv81gyCyj21lBvBSs.png?width=2890&height=1350)

<div class="feature">
  <div>
    <span class="eyebrow">Internal View</span>
    <h5>Client Portal Home Screen</h5>
    <p class="what">One dashboard for PCC staff: partner sites, files distributed, uploads received, and alerts, with push and review in a click.</p>
    <p class="solved"><strong>Problem solved:</strong> Staff wasted hours hunting for files and links scattered across inboxes, now everything lives in one view.</p>
  </div>
  <video data-autoplay muted loop playsinline preload="metadata"><source src="https://framerusercontent.com/assets/M6L5iGx6fvPgNV69Vl4vRP3w.mp4" type="video/mp4" /></video>
</div>

<div class="feature">
  <div>
    <span class="eyebrow">Internal View</span>
    <h5>Send files to partners</h5>
    <p class="what">Drop a batch in the Central Library; a Power Automate flow routes each file to the right partner's read-only From PCC folder and emails them.</p>
    <p class="solved"><strong>Problem solved:</strong> Staff manually added users and sent files one by one, automation replaces the repetitive provisioning work.</p>
  </div>
  <video data-autoplay muted loop playsinline preload="metadata"><source src="https://framerusercontent.com/assets/eyIwjjQk8OdN4HxL2zrQpDCCPM.mp4" type="video/mp4" /></video>
</div>

<div class="feature">
  <div>
    <span class="eyebrow">Internal View</span>
    <h5>Receive files from partners</h5>
    <p class="what">New uploads trigger a notification card to responsive staff in the Master Inbox, so staff process every submission from one place instead of 20 sites.</p>
    <p class="solved"><strong>Problem solved:</strong> Incoming files were lost across email and scattered folders, a single inbox catches every submission.</p>
  </div>
  <video data-autoplay muted loop playsinline preload="metadata"><source src="https://framerusercontent.com/assets/dL4vTVBNilKp1ddCyezeIHryXs.mp4" type="video/mp4" /></video>
</div>

<div class="feature">
  <div>
    <span class="eyebrow">Internal View</span>
    <h5>Partner list directory</h5>
    <p class="what">Every partner gets its own site with inheritance broken, so none can see another, each listed with its permission group setting.</p>
    <p class="solved"><strong>Problem solved:</strong> Partners were locked out by SharePoint's default permissions, isolated sites give each one reliable, scoped access.</p>
  </div>
  <video data-autoplay muted loop playsinline preload="metadata"><source src="https://framerusercontent.com/assets/pe6gyP21ZpGEQ7BplWTHvhiv0.mp4" type="video/mp4" /></video>
</div>

<div class="feature">
  <div>
    <span class="eyebrow">External View</span>
    <h5>What partners see: their space only</h5>
    <p class="what">Separate read-only "From PCC" and Upload folders keep partner data private and PCC's originals safe from overwrites.</p>
    <p class="solved"><strong>Problem solved:</strong> Partners kept overwriting critical shared files, read-only <em>From PCC</em> access prevents accidental edits.</p>
  </div>
  <video data-autoplay muted loop playsinline preload="metadata"><source src="https://framerusercontent.com/assets/T4NJDP43vSudH3DGohZE3smwaE.mp4" type="video/mp4" /></video>
</div>

## Reflection

### Reflections

<div class="cards">
  <div><h5>Establish a Technical Contingency Plan Earlier</h5><p>Instead of waiting for environment permissions, I would proactively initiate secondary research and platform-independent wireframing to further minimize the impact of technical roadblocks.</p></div>
  <div><h5>Formalize Design-to-Development Handoff</h5><p>I would integrate engineering-aligned documentation within the design system from the start to more seamlessly bridge the gap between prototypes and the final implementation environment.</p></div>
</div>

### Next Steps

<div class="cards">
  <div><h5>Validating with External Partners</h5><p>So far, usability testing has only covered internal PCC staff, the next step is validating the portal's public/private link model and folder navigation directly with external partner organizations.</p></div>
  <div><h5>Sorting Incoming Uploads</h5><p>As partners upload files through the portal, the system needs a way to sort and route incoming content (e.g., by program or file type) rather than leaving everything in a single undifferentiated inbox even if it's assigned by responsive staff.</p></div>
</div>
