import { useWorkspace } from "./hooks/useWorkspace";
import NotebookTabs from "./components/NotebookTabs";
import SectionTabs from "./components/SectionTabs";
import PageList from "./components/PageList";
import Editor from "./components/Editor";
import WelcomeScreen from "./components/WelcomeScreen";

export default function App() {
  const { workspace } = useWorkspace();

  if (!workspace) {
    return <WelcomeScreen />;
  }

  return (
    <div className="app-layout">
      <NotebookTabs />
      <SectionTabs />
      <div className="app-body">
        <PageList />
        <Editor />
      </div>
    </div>
  );
}
