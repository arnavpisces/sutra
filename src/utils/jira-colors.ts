export function getJiraStatusColor(status?: string): string {
  if (!status) return 'gray';
  const s = status.toLowerCase();
  if (s.includes('done') || s.includes('closed') || s.includes('resolved')) return 'green';
  if (s.includes('in progress') || s.includes('doing')) return 'cyan';
  if (s.includes('review') || s.includes('qa') || s.includes('testing')) return 'yellow';
  if (s.includes('blocked')) return 'red';
  if (s.includes('to do') || s.includes('open') || s.includes('backlog')) return 'blue';
  return 'white';
}

export function getJiraTypeColor(type?: string): string {
  if (!type) return 'gray';
  const t = type.toLowerCase();
  if (t.includes('bug')) return 'red';
  if (t.includes('task')) return 'cyan';
  if (t.includes('story')) return 'green';
  if (t.includes('epic')) return 'magenta';
  if (t.includes('sub-task') || t.includes('subtask')) return 'gray';
  return 'white';
}

export function getJiraPriorityColor(priority?: string): string {
  if (!priority) return 'gray';
  const p = priority.toLowerCase();
  if (p.includes('blocker') || p.includes('critical') || p.includes('highest')) return 'red';
  if (p.includes('high')) return 'yellow';
  if (p.includes('medium')) return 'cyan';
  if (p.includes('low') || p.includes('lowest')) return 'green';
  return 'white';
}
