export default function Home() {
  return (
    <main style={{ padding: '40px' }}>
      <h1>Auto Content Generator (MVP)</h1>

      <form>
        <label>
          Select niche:
          <select>
            <option value="skincare">Skincare</option>
            <option value="gadgets">Gadgets</option>
            <option value="fitness">Fitness</option>
          </select>
        </label>
        <br /><br />
        <label>
          Optional idea description:
          <input type="text" placeholder="e.g. affordable for teens" />
        </label>
        <br /><br />
        <button type="submit">Generate</button>
      </form>
    </main>
  );
}
