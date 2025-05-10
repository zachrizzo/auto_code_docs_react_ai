import net from "net";

/**
 * Check if a port is in use on the local machine.
 * @param port The port number to check.
 * @returns Promise resolving to true if the port is in use, false otherwise.
 */
export function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => {
      resolve(true); // Port is in use
    });
    server.once("listening", () => {
      server.close();
      resolve(false); // Port is free
    });
    server.listen(port);
  });
}

/**
 * Find a free port, starting from a given port number.
 * @param startPort The starting port number.
 * @returns Promise resolving to the first free port found.
 */
export async function findFreePort(startPort: number): Promise<number> {
  let port = startPort;
  while (await isPortInUse(port)) {
    console.log(`Port ${port} is already in use, trying next port...`);
    port++;
  }
  return port;
}
