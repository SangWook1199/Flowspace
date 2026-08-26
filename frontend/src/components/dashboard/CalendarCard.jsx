import { ArrowRight, Video } from 'lucide-react';
import styles from '../../styles/classes.js';
export default function CalendarCard({ events }) { return <section className={`${styles.panel} ${styles.calendarCard}`}><div className={styles.panelHeader}><div><h2>캘린더</h2><b>9월 5일 (금)</b></div><button className={styles.more}>전체 보기 <ArrowRight size={15}/></button></div>{events.map(([time,title,tone]) => <div className={styles.event} key={title}><i className={styles[tone]}/><time>{time}</time><span><Video size={13}/>{title}</span></div>)}</section>; }
