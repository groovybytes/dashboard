// import { betterAuth } from "better-auth";
// import { betterAuth as betterAuthBase } from "better-auth";
 
// export const auth = betterAuth({
//     database: betterAuthBase({
//         database: cosmosDbAdapter(payload),
//         plugins: [],
//         //... other options
//       }),
// })

export const auth = {
    handler() {
        return Promise.resolve(new Response("Hello World"))
    }
}

export {}