#!/bin/bash
set -e

VM_NAME="claude-sandbox"
PROJECT_PATH="/Users/richardhallett/Documents/code/noclaude"
VM_PROJECT_PATH="/home/ubuntu/noclaude"

echo "🚀 Setting up Multipass VM for Claude Code..."

# Check if VM exists
if multipass list | grep -q "$VM_NAME"; then
  echo "✅ VM '$VM_NAME' already exists"
else
  echo "📦 Creating VM '$VM_NAME'..."
  multipass launch --name "$VM_NAME" \
    --cpus 12 \
    --memory 24G \
    --disk 100G
  echo "✅ VM created"
fi

# Transfer project directory to VM
echo "📁 Transferring project directory..."
if multipass exec "$VM_NAME" -- test -d "$VM_PROJECT_PATH"; then
  echo "✅ Project directory already exists at $VM_PROJECT_PATH"
else
  echo "Copying files to VM (this may take a minute)..."
  multipass transfer -r "$PROJECT_PATH" "$VM_NAME:/home/ubuntu/"
  echo "✅ Project transferred to $VM_PROJECT_PATH"
fi

# Install Bun, dependencies, and Claude Code
echo "🔧 Installing Bun and dependencies..."
multipass exec "$VM_NAME" -- bash -c '
  # Install Bun if not already installed
  if ! command -v bun &> /dev/null; then
    echo "Installing Bun..."
    curl -fsSL https://bun.sh/install | bash
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
    echo "export BUN_INSTALL=\"\$HOME/.bun\"" >> ~/.bashrc
    echo "export PATH=\"\$BUN_INSTALL/bin:\$PATH\"" >> ~/.bashrc
    echo "✅ Bun $(bun -v) installed"
  else
    echo "✅ Bun $(bun -v) already installed"
  fi

  # Install Claude Code globally if not already installed
  if ! command -v claude &> /dev/null; then
    echo "📦 Installing Claude Code..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
    sudo npm install -g @anthropic-ai/claude-code
    echo "✅ Claude Code installed"
  else
    echo "✅ Claude Code already installed"
  fi

  # Install bun dependencies
  cd '"$VM_PROJECT_PATH"'
  if [ ! -d "node_modules" ]; then
    echo "📦 Installing project dependencies..."
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
    bun install
    echo "✅ Dependencies installed"
  else
    echo "✅ Dependencies already installed"
  fi
'

# Configure SSH for Remote development
echo "🔐 Configuring SSH access..."

# Install and enable SSH server in VM
multipass exec "$VM_NAME" -- bash -c '
  if ! systemctl is-active --quiet ssh; then
    echo "Installing OpenSSH server..."
    sudo apt-get update -qq
    sudo apt-get install -y openssh-server
    sudo systemctl enable ssh
    sudo systemctl start ssh
    echo "✅ SSH server installed and started"
  else
    echo "✅ SSH server already running"
  fi
'

# Get VM IP address
VM_IP=$(multipass info "$VM_NAME" | grep IPv4 | awk '{print $2}')
echo "VM IP address: $VM_IP"

# Setup SSH key if it doesn't exist
if [ ! -f "$HOME/.ssh/id_rsa" ]; then
  echo "Generating SSH key..."
  ssh-keygen -t rsa -b 4096 -f "$HOME/.ssh/id_rsa" -N ""
  echo "✅ SSH key generated"
else
  echo "✅ SSH key already exists"
fi

# Copy SSH key to VM if not already there
if ! multipass exec "$VM_NAME" -- test -f /home/ubuntu/.ssh/authorized_keys ||
  ! multipass exec "$VM_NAME" -- grep -q "$(cat $HOME/.ssh/id_rsa.pub)" /home/ubuntu/.ssh/authorized_keys 2>/dev/null; then
  echo "Copying SSH key to VM..."
  multipass exec "$VM_NAME" -- mkdir -p /home/ubuntu/.ssh
  multipass exec "$VM_NAME" -- chmod 700 /home/ubuntu/.ssh
  cat "$HOME/.ssh/id_rsa.pub" | multipass exec "$VM_NAME" -- tee -a /home/ubuntu/.ssh/authorized_keys >/dev/null
  multipass exec "$VM_NAME" -- chmod 600 /home/ubuntu/.ssh/authorized_keys
  echo "✅ SSH key copied to VM"
else
  echo "✅ SSH key already authorized in VM"
fi

# Add SSH config entry if it doesn't exist
SSH_CONFIG="$HOME/.ssh/config"
touch "$SSH_CONFIG"

if grep -q "Host $VM_NAME" "$SSH_CONFIG"; then
  echo "✅ SSH config entry already exists"
else
  echo "Adding SSH config entry..."
  cat >>"$SSH_CONFIG" <<EOF

Host $VM_NAME
  HostName $VM_IP
  User ubuntu
  StrictHostKeyChecking no
  UserKnownHostsFile /dev/null
EOF
  echo "✅ SSH config entry added"
fi

# Test SSH connection
echo "Testing SSH connection..."
if ssh -o ConnectTimeout=5 "$VM_NAME" "echo '✅ SSH connection successful'" 2>/dev/null; then
  SSH_WORKS=true
else
  echo "⚠️  SSH connection test failed, but may work after VM fully boots"
  SSH_WORKS=false
fi

echo ""
echo "✨ Setup complete!"
echo ""
echo "🖥️  Remote Development with Cursor:"
echo "  1. Install 'Remote - SSH' extension in Cursor"
echo "  2. Cmd+Shift+P → 'Remote-SSH: Connect to Host'"
echo "  3. Select '$VM_NAME'"
echo "  4. Open folder: $VM_PROJECT_PATH"
echo ""
echo "🔧 To run commands in VM:"
echo "  ssh $VM_NAME"
echo "  cd ~/noclaude"
echo "  bun run build"
echo ""
echo "🤖 To use Claude Code with bypass permissions:"
echo "  ssh $VM_NAME"
echo "  cd ~/noclaude"
echo "  claude --bypass-permissions"
echo ""
echo "⏸️  To stop the VM:"
echo "  multipass stop $VM_NAME"
echo ""
echo "🔄 To restart the VM:"
echo "  multipass start $VM_NAME"
