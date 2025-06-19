const response = await fetch("https://dccon.dcinside.com/");
const data = response.headers.get("Set-Cookie");
const cookie = data.split(";");

console.log(cookie);