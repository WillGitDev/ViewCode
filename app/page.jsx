// app/page.jsx
import DevInspector from "./components/DevInspector";
import Playground from "./components/Playground";

export default function Home() {
  return (
    <main>
      <DevInspector>
        <Playground />
      </DevInspector>
    </main>
  );
}
