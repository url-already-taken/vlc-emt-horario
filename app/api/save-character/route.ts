import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Path to the data file
const DATA_FILE = path.join(process.cwd(), "data", "bus-stops.json");

// Function to read data from the file
function readData(): Record<string, string> {
  if (!fs.existsSync(DATA_FILE)) {
    return {};
  }
  const fileContent = fs.readFileSync(DATA_FILE, "utf8");
  return JSON.parse(fileContent || "{}");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { stopId, character } = body;

    if (!stopId || !character || character.length !== 1) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const data = readData();
    data[stopId] = character;
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error saving character:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const data = readData();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Error reading data:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}