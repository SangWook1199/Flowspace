import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SprintCard from '../components/sprint/SprintCard';
import SprintFilterBar from '../components/sprint/SprintFilterBar';
import SprintHero from '../components/sprint/SprintHero';
import { sprints, sprintSummary } from '../mock/sprints';

export default function SprintList() {
  const navigate = useNavigate(); const [filter, setFilter] = useState('ALL'); const [query, setQuery] = useState('');
  const visible = useMemo(() => sprints.filter(sprint => (filter === 'ALL' || sprint.status === filter) && sprint.name.toLowerCase().includes(query.toLowerCase())), [filter, query]);
  const onNavigate = id => navigate(`/sprints/${id}`);
  return <div className="sprintListPage"><SprintHero summary={sprintSummary} onCreate={() => navigate('/sprints/new')}/><SprintFilterBar value={filter} query={query} onFilter={setFilter} onQuery={setQuery}/><section className="sprintCards">{visible.map(sprint => <SprintCard key={sprint.id} sprint={sprint} onNavigate={onNavigate}/>)}{!visible.length && <p className="emptySprints">조건에 맞는 스프린트가 없습니다.</p>}</section></div>;
}
