export const WORK_TYPE_OPTIONS = [
  { id: 'remote', label: 'Remote' },
  { id: 'hybrid', label: 'Hybrid' },
  { id: 'on_site', label: 'On-site' },
  { id: 'full_time', label: 'Full-time' },
  { id: 'part_time', label: 'Part-time' },
  { id: 'contract', label: 'Contract' },
  { id: 'permanent', label: 'Permanent' },
  { id: 'internship', label: 'Internship' },
] as const;

export type WorkTypeId = (typeof WORK_TYPE_OPTIONS)[number]['id'];

export function inferWorkTypes(job: {
  title?: string;
  location?: string;
  description?: string;
  scheduleType?: string;
}): WorkTypeId[] {
  const blob = [
    job.title,
    job.location,
    job.scheduleType,
    job.description?.slice(0, 800),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const types = new Set<WorkTypeId>();

  if (/\b(remote|work from home|wfh|anywhere)\b/.test(blob)) types.add('remote');
  if (/\bhybrid\b/.test(blob)) types.add('hybrid');
  if (/\b(intern(ship)?|graduate programme|graduate program)\b/.test(blob)) types.add('internship');
  if (/\b(contract|freelance|temporary|fixed[- ]term|consultant)\b/.test(blob)) types.add('contract');
  if (/\bpart[- ]?time\b/.test(blob)) types.add('part_time');
  if (/\b(full[- ]?time|permanent)\b/.test(blob)) types.add('full_time');
  if (/\bpermanent\b/.test(blob)) types.add('permanent');

  if (!types.has('remote') && !types.has('hybrid') && /\b(on[- ]?site|office[- ]based|in[- ]office)\b/.test(blob)) {
    types.add('on_site');
  }

  if (types.size === 0) {
    if (job.scheduleType) {
      const st = job.scheduleType.toLowerCase();
      if (st.includes('remote')) types.add('remote');
      else if (st.includes('hybrid')) types.add('hybrid');
      else if (st.includes('part')) types.add('part_time');
      else if (st.includes('contract')) types.add('contract');
      else if (st.includes('full')) types.add('full_time');
      else types.add('on_site');
    } else if (job.location && !/\bremote\b/i.test(job.location)) {
      types.add('on_site');
    }
  }

  return Array.from(types);
}

export function workTypeLabel(id: WorkTypeId): string {
  return WORK_TYPE_OPTIONS.find((o) => o.id === id)?.label || id;
}

export function countWorkTypes(
  jobs: { workTypes?: WorkTypeId[] }[]
): Record<WorkTypeId, number> {
  const counts = Object.fromEntries(WORK_TYPE_OPTIONS.map((o) => [o.id, 0])) as Record<
    WorkTypeId,
    number
  >;

  for (const job of jobs) {
    for (const t of job.workTypes || []) {
      if (t in counts) counts[t] += 1;
    }
  }

  return counts;
}

export function jobMatchesWorkTypeFilter(
  job: { workTypes?: WorkTypeId[] },
  selected: WorkTypeId[]
): boolean {
  if (!selected.length) return true;
  const types = job.workTypes || [];
  return selected.some((t) => types.includes(t));
}
