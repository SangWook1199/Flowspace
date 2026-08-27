import { ArrowRight } from 'lucide-react';
import styles from '../../styles/classes.js';
export default function TodayWorkCard({ tasks }) { return <section className={`${styles.panel} ${styles.tasks}`}><div className={styles.panelHeader}><h2>오늘의 작업</h2><button className={styles.more}>전체 보기 <ArrowRight size={15}/></button></div>{tasks.map(task => <div className={styles.taskRow} key={task.title}><i className={styles[task.tone]}/><span>{task.title}</span><b>{task.category}</b><time>{task.time}</time><button/></div>)}</section>; }
