import * as Icons from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import styles from '../styles/classes.js';

export default function Sidebar({ navigation, pages, members }) {
  const Icon = ({ name, ...props }) => { const C = Icons[name]; return <C strokeWidth={1.9} {...props} />; };
  const navigate = useNavigate(); const { pathname } = useLocation();
  const go = label => { if (label === '홈') navigate('/'); if (label === '스프린트') navigate('/sprints/new'); };
  const activeLabel = pathname.startsWith('/sprints') ? '스프린트' : '홈';
  return <aside className={styles.sidebar}><div className={styles.logoMark}><span/><i/><b/></div><strong className={styles.logo}>FlowSpace</strong><button className={styles.workspace}><span className={styles.workspaceIcon}>H</span><span><b>Human EXE</b><small>워크스페이스</small></span><Icon name="ChevronDown" size={18}/></button><nav>{navigation.map(([label, icon]) => <button onClick={() => go(label)} className={`${styles.navItem} ${label === activeLabel ? styles.selected : ''}`} key={label}><Icon name={icon}/><span>{label}</span></button>)}</nav><div className={styles.pageArea}><div className={styles.divider}/><p>페이지</p>{pages.map(page => <button className={styles.navItem} key={page}><Icon name="FileText"/><span>{page}</span></button>)}<button className={`${styles.navItem} ${styles.newPage}`}><Icon name="Plus"/><span>새 페이지</span></button></div><div className={styles.memberMini}><small><em/> 온라인 팀원 2 / 4</small><div>{members.map(member => <span className={`${styles.avatar} ${styles[member.tone]}`} key={member.name}>{member.initial}</span>)}</div></div></aside>;
}
