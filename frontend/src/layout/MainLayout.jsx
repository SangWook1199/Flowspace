import styles from "../styles/classes.js";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { Outlet } from "react-router-dom";
import { members, navigation, pages } from "../mock/dashboard";

export default function MainLayout() {
  return (
    <>
      <Sidebar navigation={navigation} pages={pages} members={members} />
      <main className={styles.main}>
        <Header />
        <Outlet />
      </main>
    </>
  );
}
