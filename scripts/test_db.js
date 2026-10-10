const supabaseUrl = "https://xaqbisnaetgsjiortzgi.supabase.co";
const secretKey = "sb_secret_IjjOPvnK-DuOpwIhmfM3Hg_IHPqiS2g";

async function inspectSchema() {
  console.log("Fetching OpenAPI spec with secret key...");
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`
      }
    });
    const data = await res.json();
    if (data.definitions) {
      console.log("\nLive tables available via REST API:");
      Object.keys(data.definitions).forEach((t, i) => console.log(`${i+1}. ${t}`));
    } else {
      console.log("Response:", data);
    }
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

inspectSchema();
