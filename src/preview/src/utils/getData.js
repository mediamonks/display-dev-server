export default async function getData(url) {
  const data = await fetch(url, { headers: { "Content-Type": "application/json", Accept: "application/json" } });
  return data.json();
}
