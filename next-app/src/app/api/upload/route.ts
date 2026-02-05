import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    return NextResponse.json({ error: 'Missing PINATA_JWT' }, { status: 500 });
  }

  const formData = await request.formData();
  const files = formData.getAll('files') as File[];

  if (!files || files.length === 0) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 });
  }

  const uploaded: Array<{ name: string; size: number; url: string }> = [];

  for (const file of files) {
    const pinataForm = new FormData();
    pinataForm.append('file', file, file.name);

    const pinataRes = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      body: pinataForm,
    });

    if (!pinataRes.ok) {
      const errText = await pinataRes.text();
      return NextResponse.json({ error: errText || 'Pinata upload failed' }, { status: 500 });
    }

    const data = await pinataRes.json();
    const hash = data.IpfsHash as string;
    uploaded.push({
      name: file.name,
      size: file.size,
      url: `ipfs://${hash}`,
    });
  }

  return NextResponse.json({ uploaded });
}
