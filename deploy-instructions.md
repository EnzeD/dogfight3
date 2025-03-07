# Dogfight3 Deployment Instructions with SSL

Follow these instructions to deploy your Dogfight3 multiplayer server with SSL support on your OVH VPS.

## Prerequisites

- OVH VPS with Ubuntu/Debian or similar Linux distribution
- SSH access to your VPS
- Node.js installed on your VPS (v12 or newer)
- Your domain (fly.zullo.fun) pointing to your VPS IP

## Step 1: Upload Files to Your VPS

1. Transfer the `deploy-temp-with-ssl.zip` file to your VPS using SCP:

```bash
scp deploy-temp-with-ssl.zip ubuntu@141.95.17.225:~/
```

2. SSH into your VPS:

```bash
ssh ubuntu@141.95.17.225
```

3. Create a directory for the game and extract the files:

```bash
mkdir -p dogfight3
unzip deploy-temp-with-ssl.zip -d dogfight3
cd dogfight3
```

## Step 2: Install Dependencies

Install the required Node.js packages:

```bash
npm install
```

## Step 3: Verify SSL Certificates

Check that the SSL certificates are correctly placed in the `ssl` directory:

```bash
ls -la ssl/
```

You should see two files:
- `privkey.pem` - Private key
- `fullchain.pem` - Certificate file

## Step 4: Test the Server

Run the server to make sure it starts correctly:

```bash
node server.js
```

You should see output like:

```
WebSocket server starting...
WebSocket server started on HTTP port 8080
WebSocket server started on HTTPS port 8443
SSL certificates loaded successfully
```

Press Ctrl+C to stop the server after testing.

## Step 5: Configure the Server to Run Permanently

To keep the server running after you log out, install PM2:

```bash
# Install PM2 globally
npm install -g pm2

# Start the server with PM2
pm2 start server.js --name dogfight3

# Make PM2 start on system boot
pm2 startup
pm2 save
```

## Step 6: Configure Firewall

Make sure the needed ports are open:

```bash
# For Ubuntu/Debian with UFW
sudo ufw allow 8080/tcp
sudo ufw allow 8443/tcp
sudo ufw status

# For CentOS/RHEL with firewalld
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --permanent --add-port=8443/tcp
sudo firewall-cmd --reload
```

## Step It's Working!

Congratulations! Your Dogfight3 multiplayer server should now be running with SSL support.

- HTTP WebSocket URL: `ws://fly.zullo.fun:8080`
- HTTPS WebSocket URL: `wss://fly.zullo.fun:8443`

## Troubleshooting

If you encounter issues:

1. **Server won't start**:
   - Check the Node.js error output
   - Verify SSL certificate permissions: `chmod 644 ssl/*`

2. **Can't connect from game**:
   - Check if the firewall is blocking ports
   - Verify that the domain is correctly pointing to your VPS IP

3. **SSL certificate issues**:
   - These self-signed certificates are for development only
   - For production, get real certificates from Let's Encrypt

## Upgrading to Real SSL Certificates

For a production environment, replace the self-signed certificates with Let's Encrypt certificates:

```bash
# Install certbot
sudo apt-get update
sudo apt-get install -y certbot

# Get certificates (replace with your domain)
sudo certbot certonly --standalone -d fly.zullo.fun

# Copy certificates to your application directory
sudo cp /etc/letsencrypt/live/fly.zullo.fun/privkey.pem ~/dogfight3/ssl/
sudo cp /etc/letsencrypt/live/fly.zullo.fun/fullchain.pem ~/dogfight3/ssl/

# Fix permissions
sudo chmod 644 ~/dogfight3/ssl/*

# Restart the server
pm2 restart dogfight3
``` 