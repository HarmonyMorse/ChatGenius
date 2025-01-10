# AWS EC2 Deployment Notes

## CORS Configuration

When deploying to EC2, the following changes are needed to handle cross-origin requests properly:

### Server Configuration
1. Update `server/.env` to include the EC2 client URL:
```env
CLIENT_URL=http://<EC2-PUBLIC-IP>:5173
```

### Client Configuration
1. Update `client/.env` to point to the EC2 server URL:
```env
VITE_API_URL=http://<EC2-PUBLIC-IP>:3000
```

Replace `<EC2-PUBLIC-IP>` with your EC2 instance's public IP address or domain name.

## Security Notes
- Make sure your EC2 security group allows inbound traffic on ports 3000 (server) and 5173 (client)
- Consider using HTTPS in production for secure communication
- Consider using a domain name instead of IP address for better security and maintainability

## Deployment Steps
1. SSH into your EC2 instance
2. Clone the repository
3. Update the environment files as described above
4. Install dependencies and build both client and server
5. Start the server and client applications

## Troubleshooting
If CORS issues persist:
1. Check that the CLIENT_URL in server/.env exactly matches your client's URL (including protocol and port)
2. Verify that the VITE_API_URL in client/.env exactly matches your server's URL
3. Ensure no trailing slashes in the URLs
4. Check EC2 security group settings allow traffic on required ports 