import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SprintForm from "../components/sprint/SprintForm";

export default function SprintCreate() {
  const navigate = useNavigate();
  return (
    <div className="sprintCreatePage">
      <div className="breadcrumb">
        <span>스프린트</span>
        <ChevronRight size={16} />
        <b>새 스프린트 생성</b>
      </div>
      <div className="sprintPageHeading">
        <div>
          <h1>새 스프린트 생성</h1>
          <p>새로운 스프린트를 생성하고 팀의 목표를 설정해보세요.</p>
        </div>
        <button onClick={() => navigate("/")}>
          <ChevronLeft size={17} /> 스프린트 목록으로
        </button>
      </div>
      <SprintForm />
    </div>
  );
}
