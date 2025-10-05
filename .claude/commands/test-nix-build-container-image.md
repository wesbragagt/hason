# Test Nix Build Container Image

This command tests the complete Nix-based Docker container build process for the Hason application, including WASM compilation, app building, and nginx serving.

## Purpose

Verify that the pure Nix Docker image build works correctly by:
1. Building the complete container image with integrated WASM files
2. Running the container with nginx serving the single-page application
3. Testing that the jq WASM functionality works in the browser

## Prerequisites

- Nix with flakes enabled
- Docker or Podman installed and running
- Available port (default: 8080)

## Test Steps

### 1. Build the Docker Image

```bash
# Build the complete Docker image using Nix
nix build .#docker-image
```

**Expected outcome**:
- Build completes successfully
- Creates a `result` symlink pointing to the Docker image tar.gz

### 2. Load the Image

```bash
# Load into Docker
docker load < result

# OR load into Podman
podman load < result
```

**Expected outcome**:
- Image loads successfully as `localhost/hason:latest`
- No errors during load process

### 3. Run the Container

```bash
# Using Docker
docker run -d --name hason-test -p 8080:80 localhost/hason:latest

# OR using Podman
podman run -d --name hason-test -p 8080:80 localhost/hason:latest
```

**Expected outcome**:
- Container starts successfully
- Port 8080 is bound and accessible

### 4. Test Basic HTTP Response

```bash
# Test that nginx is serving content
curl -I http://localhost:8080

# Should return HTTP 200 OK with nginx headers
```

**Expected outcome**:
```
HTTP/1.1 200 OK
Server: nginx/1.28.0
Content-Type: text/html
```

### 5. Test Application Loading

```bash
# Test that the main page loads
curl -s http://localhost:8080 | grep -i "hason\|json"

# Test that WASM files are accessible
curl -I http://localhost:8080/jq.wasm
curl -I http://localhost:8080/jq.js
```

**Expected outcome**:
- Main page contains application content
- WASM files return HTTP 200 with correct MIME types
- jq.wasm should have `Content-Type: application/wasm`

### 6. Test SPA Routing

```bash
# Test that non-existent routes serve the index.html (SPA routing)
curl -s http://localhost:8080/some/random/path | head -20
```

**Expected outcome**:
- Returns the same content as the root path (index.html)
- No 404 errors for application routes

### 7. Test WASM Functionality (Browser Test)

Open a browser and navigate to `http://localhost:8080`:

1. **Application loads**: The Hason JSON formatter interface appears
2. **Enter test JSON**: Try entering `{"test": "value"}` in the input
3. **Apply jq filter**: Try a simple filter like `.test`
4. **Verify output**: Should show `"value"` as the result

**Expected outcome**:
- Application loads without console errors
- WASM module loads successfully
- jq filtering works correctly
- No network errors for WASM files

### 8. Container Health Check

```bash
# Check container logs for any errors
docker logs hason-test
# OR
podman logs hason-test

# Check container is still running
docker ps | grep hason-test
# OR
podman ps | grep hason-test
```

**Expected outcome**:
- No error messages in logs
- Container shows as "Up" and healthy
- Nginx access logs show successful requests

### 9. Performance Test

```bash
# Test that static assets are cached properly
curl -I http://localhost:8080/assets/index.css | grep -i cache
curl -I http://localhost:8080/jq.wasm | grep -i cache
```

**Expected outcome**:
- Static assets return cache headers
- Should see `Cache-Control: public, immutable` for assets
- Should see `expires` headers set to 1 year

### 10. Cleanup

```bash
# Stop and remove test container
docker stop hason-test && docker rm hason-test
# OR
podman stop hason-test && podman rm hason-test

# Optional: Remove the test image
docker rmi localhost/hason:latest
# OR
podman rmi localhost/hason:latest
```

## Troubleshooting

### Build Failures
- Check that all dependencies are available in the Nix store
- Verify Node.js 22 and pnpm are accessible
- Ensure WASM files are being copied correctly

### Container Start Issues
- Check port 8080 is not already in use: `lsof -i :8080`
- Verify nginx configuration syntax
- Check container logs for startup errors

### WASM Loading Issues
- Verify WASM files exist in the container: `docker exec hason-test ls -la /nix/store/*/`
- Check MIME types are set correctly for .wasm files
- Ensure CORS headers allow WASM loading

### Application Functionality Issues
- Open browser developer tools and check console for errors
- Verify network tab shows successful WASM file downloads
- Test with simple jq expressions first (e.g., `.`)

## Success Criteria

The test passes when:
- [x] Docker image builds successfully with Nix
- [x] Container starts and serves on port 8080
- [x] Main application page loads without errors
- [x] WASM files are accessible with correct MIME types
- [x] jq filtering functionality works in the browser
- [x] SPA routing serves index.html for all paths
- [x] Static assets are properly cached
- [x] No errors in container logs

## Alternative: Using the Convenience Command

You can also use the built-in convenience command:

```bash
# This does steps 1-3 automatically
nix run .#build-docker-image

# Then continue with testing from step 4
```

This command builds the image and loads it into the available container runtime (Docker or Podman).