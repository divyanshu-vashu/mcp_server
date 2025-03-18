import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = new McpServer({
    name: "UITemplateServer",
    version: "1.0.0"
});

const libraryPath = path.join(__dirname, 'AppointySaastak');

// Schema for login components
const LoginComponentSchema = z.object({
    component: z.enum(['login', 'login-modern'])
});

server.resource(
    "ui-template",
    new ResourceTemplate("appointy://ui/{component}", { 
        list: ["login", "login-modern"],
        schema: LoginComponentSchema 
    }),
    async (uri, { component }) => {
        try {
            const componentPath = path.join(libraryPath, 'ui', component);
            console.log(`Loading login component: ${component} from ${componentPath}`);

            // Define file paths
            const indexPath = path.join(componentPath, 'index.html');
            const stylesPath = path.join(componentPath, 'style.css');
            const scriptPath = path.join(componentPath, 'script.js');
            const backendPath = path.join(componentPath, 'backend.js');

            // Read all files
            const [indexHTML, stylesCSS, scriptJS, backendJS] = await Promise.all([
                fs.readFile(indexPath, 'utf-8'),
                fs.readFile(stylesPath, 'utf-8').catch(() => '/* No styles found */'),
                fs.readFile(scriptPath, 'utf-8').catch(() => '// No script found'),
                fs.readFile(backendPath, 'utf-8').catch(() => null)
            ]);

            // Prepare metadata about the component
            const metadata = {
                name: component,
                type: 'login',
                features: component === 'login-modern' 
                    ? ['social-login', 'modern-ui', 'split-layout']
                    : ['basic-login', 'signup-toggle'],
                description: component === 'login-modern'
                    ? 'A modern login interface with social media integration and split layout'
                    : 'A simple and clean login/signup toggle interface'
            };

            // Prepare the response
            const contents = [
                { 
                    uri: `appointy://ui/${component}/index.html`, 
                    type: "text/html", 
                    text: indexHTML 
                },
                { 
                    uri: `appointy://ui/${component}/style.css`, 
                    type: "text/css", 
                    text: stylesCSS 
                },
                { 
                    uri: `appointy://ui/${component}/script.js`, 
                    type: "text/javascript", 
                    text: scriptJS 
                }
            ];

            if (backendJS) {
                contents.push({ 
                    uri: `appointy://ui/${component}/backend.js`, 
                    type: "text/javascript", 
                    text: backendJS 
                });
            }

            return { 
                contents,
                metadata
            };

        } catch (error) {
            console.error(`Error loading login component ${component}:`, error);
            return {
                contents: [{ 
                    type: "text", 
                    text: `Error: Could not load login component ${component}` 
                }],
                isError: true,
                errorDetails: error.message
            };
        }
    }
);

const transport = new StdioServerTransport();
await server.connect(transport);