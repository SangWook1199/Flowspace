import { ArrowRight } from 'lucide-react';
import MainLayout from '../layout/MainLayout';
import SprintBanner from '../components/dashboard/SprintBanner';
import MetricCard from '../components/dashboard/MetricCard';
import TodayWorkCard from '../components/dashboard/TodayWorkCard';
import ActivityCard from '../components/dashboard/ActivityCard';
import OnlineTeamCard from '../components/dashboard/OnlineTeamCard';
import CalendarCard from '../components/dashboard/CalendarCard';
import { activities, calendar, kpis, members, navigation, pages, todayTasks } from '../mock/dashboard';
import styles from '../styles/classes.js';

function SprintStatusCard() { return <section className={`${styles.panel} ${styles.sprintCard}`}><div className={styles.panelHeader}><h2>진행 중 Sprint</h2><button className={styles.more}>전체 보기 <ArrowRight size={15}/></button></div><div className={styles.sprintTitle}>Sprint 1 <span>진행 중</span></div><small>2026.09.01&nbsp; ~ &nbsp;2026.09.14</small><div className={styles.progressRow}><div className={styles.progress}><i/></div><b>68%</b></div><div className={styles.sprintStats}><span>전체 작업<b>35</b></span><span>완료<b>24</b></span><span>진행 중<b>8</b></span><span>대기<b>3</b></span></div></section>; }

export default function Dashboard() { return <MainLayout navigation={navigation} pages={pages} members={members}><div className={styles.content}><section className={styles.welcome}><div><h1>안녕하세요, 상욱님 <span>👋</span></h1><p>오늘도 FlowSpace와 함께 더 나은 협업을 만들어가요.</p></div><time>2025.05.28 (수)</time></section><div className={styles.dashboardGrid}><div className={styles.primary}><SprintBanner/><div className={styles.kpis}>{kpis.map(item => <MetricCard key={item.label} item={item}/>)}</div><div className={styles.lowerGrid}><TodayWorkCard tasks={todayTasks}/><div className={styles.midStack}><SprintStatusCard/><CalendarCard events={calendar}/></div></div></div><aside className={styles.rightRail}><ActivityCard activities={activities}/><OnlineTeamCard members={members}/></aside></div></div></MainLayout>; }
