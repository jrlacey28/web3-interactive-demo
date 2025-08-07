Create the "My Worlds" system with this structure:

1. 🌍 Main World (Public)
   - Every user gets one main public world (like their homepage)
   - Display username, bio, and featured content
   - Show their NFT collection
   - Public URL: /world/[username]
   - Acts as their creator profile/showcase

2. 📄 Connected Sub-Pages/Worlds
   - Multiple sub-worlds that connect to the main world
   - Each can be set as: Public, Private, or Paywall (future feature)
   - Examples: /world/[username]/gallery, /world/[username]/exclusive-content
   - Navigation between main world and sub-worlds

3. 🛠️ World Management Dashboard
   - "Create World" button in dashboard
   - List of all their worlds (main + sub-worlds)
   - Edit/delete functionality
   - Privacy settings toggle
   - Preview links

4. 🎨 Basic Customization
   - World name and description
   - Banner/header image support
   - Color theme selection
   - Layout templates (grid, list, etc.)

Start with the main world creation and public viewing, then we'll add sub-world management and eventually integrate NFT fetching from their wallet.