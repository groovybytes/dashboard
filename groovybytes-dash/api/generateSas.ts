export const getSasUrl = async (blobName: string) => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/blobSasService?blobName=${blobName}`);
    if (!response.ok) throw new Error("Failed to get SAS URL");
    const data = await response.json();
    return data.sasUrl;
};
