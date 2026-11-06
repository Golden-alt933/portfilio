import { Route, Routes } from "react-router-dom";
import ImmersiveHome from "./ImmersiveHome";
import ProjectPage, { MissingPage } from "./ProjectPage";
import WorksIndex from "./WorksIndex";
import PortfolioShell from "./PortfolioShell";
import SceneHost from "./SceneHost";
import ScrollProvider from "./ScrollProvider";

export default function App() {
  return (
    <SceneHost>
      <ScrollProvider>
        <PortfolioShell>
          <Routes>
            <Route path="/" element={<ImmersiveHome />} />
            <Route path="/works" element={<WorksIndex />} />
            <Route path="/work/:slug" element={<ProjectPage />} />
            <Route path="*" element={<MissingPage />} />
          </Routes>
        </PortfolioShell>
      </ScrollProvider>
    </SceneHost>
  );
}
