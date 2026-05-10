import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bbl = searchParams.get("bbl");

  if (!bbl) {
    return NextResponse.json({ error: "BBL is required" }, { status: 400 });
  }

  try {
    // 1. Fetch zoning districts from NYC Planning Carto API
    // Table 'mappluto' contains the most up-to-date lot-level zoning info
    const query = `SELECT zonedist1, zonedist2, zonedist3, bbl, address, numfloors, bldgarea FROM mappluto WHERE bbl::text = '${bbl}' LIMIT 1`;
    const response = await fetch(
      `https://planninglabs.carto.com/api/v2/sql?q=${encodeURIComponent(query)}`
    );

    if (!response.ok) {
      throw new Error(`Carto API responded with ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.rows || data.rows.length === 0) {
      return NextResponse.json({ error: "BBL not found in PLUTO database" }, { status: 404 });
    }

    const lot = data.rows[0];
    const districts = [lot.zonedist1, lot.zonedist2, lot.zonedist3].filter(Boolean);

    return NextResponse.json({
      bbl: lot.bbl,
      address: lot.address,
      zoningDistricts: districts,
      metadata: {
        floors: lot.numfloors,
        area: lot.bldgarea
      }
    });
  } catch (error: any) {
    console.error("Lookup error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
