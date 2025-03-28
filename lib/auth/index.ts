import { AZURE_ENTRA_CLIENT_ID, AZURE_ENTRA_CLIENT_SECRET } from "./config";
import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins";
 
export const auth = betterAuth({
    //... other options
    // database: cosmosDbAdapter(payload),
    plugins: [
        bearer()
    ],
    socialProviders: {
        microsoft: { 
            clientId: AZURE_ENTRA_CLIENT_ID, 
            clientSecret: AZURE_ENTRA_CLIENT_SECRET, 
            // Optional
            tenantId: 'common', 
            requireSelectAccount: true,
        }, 
    },
})
