const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Define models - adjust paths as needed
const User = require('./models/User');
const Room = require('./models/Room');
const Message = require('./models/Message');

// Kenyan names data
const kenyanFirstNames = [
  'Wanjiru', 'Kamau', 'Nyambura', 'Kipchoge', 'Auma', 'Ochieng', 'Atieno', 
  'Mumbi', 'Korir', 'Chebet', 'Maina', 'Akinyi', 'Odhiambo', 'Wairimu', 'Jelimo'
];

const kenyanLastNames = [
  'Omondi', 'Wambui', 'Kiptoo', 'Onyango', 'Aketch', 'Kariuki', 'Njoroge',
  'Muthoni', 'Kibet', 'Chepkoech', 'Otieno', 'Nyaga', 'Wafula', 'Njeri', 'Koech'
];

// Topic-specific message templates
const roomMessages = {
  'general': [
    "Hello everyone! How's your day going?",
    "Anyone up for a general chat?",
    "What's new with you all?",
    "Just checking in with everyone",
    "Let's keep this conversation going!"
  ],
  'arsenal': [
    "What a performance from the team last night!",
    "Arteta is really building something special",
    "Our defense looks solid this season",
    "That new signing looks promising",
    "North London is red!",
    "We need to strengthen in January",
    "The title race is on!",
    "Saka is world class, no doubt",
    "How about that goal from Ødegaard?",
    "Our midfield is dominating games now"
  ],
  'man-u': [
    "Tough result at the weekend",
    "We need to back the manager",
    "That new signing needs time to adapt",
    "Old Trafford needs to be a fortress again",
    "Glazers out!",
    "The youth academy is producing again",
    "We'll bounce back from this",
    "Remember the glory days under Fergie?",
    "The derby is coming up soon",
    "We need to improve our away form"
  ],
  'liverpool': [
    "YNWA! What a comeback!",
    "Klopp is the best manager in the world",
    "Anfield on European nights is special",
    "That new midfielder looks class",
    "We're building for the future",
    "The title race is heating up",
    "Salah is still world class",
    "The youngsters are stepping up",
    "We need to be more consistent",
    "That was a proper Liverpool performance"
  ],
  'bedsa': [
    "Great meeting yesterday everyone",
    "The project is coming along nicely",
    "Let's schedule the next workshop",
    "Anyone available to help with the event?",
    "The community outreach is going well",
    "We need more volunteers for the program",
    "The feedback has been very positive",
    "Let's brainstorm some new ideas",
    "The fundraising target is within reach",
    "Great work team, keep it up!"
  ]
};

// Conversation flows for each room
const conversationFlows = {
  'arsenal': [
    { userIndex: 0, message: "What did you think of the match yesterday?" },
    { userIndex: 1, message: "Brilliant performance! Saka was on fire!" },
    { userIndex: 2, message: "Yes, but our defense still looks shaky at times" },
    { userIndex: 3, message: "I think Saliba had a great game though" },
    { userIndex: 4, message: "The title race is really heating up now" },
    { userIndex: 0, message: "Do you think we need any January signings?" },
    { userIndex: 1, message: "A backup striker would be ideal" },
    { userIndex: 2, message: "I'd prefer a solid defensive midfielder" },
    { userIndex: 3, message: "What about that young winger we've been linked with?" },
    { userIndex: 4, message: "As long as we don't overspend like last time!" }
  ],
  'man-u': [
    { userIndex: 0, message: "Another disappointing result..." },
    { userIndex: 1, message: "We really need to sort out our defense" },
    { userIndex: 2, message: "The manager needs more time though" },
    { userIndex: 3, message: "Time? We've been saying that for years!" },
    { userIndex: 4, message: "At least the youngsters are getting chances" },
    { userIndex: 0, message: "That new signing looks promising" },
    { userIndex: 1, message: "He needs to adapt to the Premier League" },
    { userIndex: 2, message: "Remember how long it took Vidic to settle?" },
    { userIndex: 3, message: "Different times, we need results now" },
    { userIndex: 4, message: "The next few games are crucial" }
  ],
  'liverpool': [
    { userIndex: 0, message: "What a win! YNWA!" },
    { userIndex: 1, message: "The atmosphere at Anfield was electric" },
    { userIndex: 2, message: "That new midfielder is exactly what we needed" },
    { userIndex: 3, message: "Still think we need another defender" },
    { userIndex: 4, message: "Klopp is working his magic again" },
    { userIndex: 0, message: "How far can we go in the Champions League?" },
    { userIndex: 1, message: "All the way if we stay injury-free" },
    { userIndex: 2, message: "The squad depth is better this season" },
    { userIndex: 3, message: "That comeback was typical Liverpool!" },
    { userIndex: 4, message: "The derby is coming up soon - big test!" }
  ],
  'bedsa': [
    { userIndex: 0, message: "Great progress on the project everyone" },
    { userIndex: 1, message: "Yes, the community feedback has been positive" },
    { userIndex: 2, message: "We should plan the next outreach session" },
    { userIndex: 3, message: "I can organize the venue if needed" },
    { userIndex: 4, message: "Let's set some clear goals for next month" },
    { userIndex: 0, message: "The fundraising is going well too" },
    { userIndex: 1, message: "We're at 75% of our target already" },
    { userIndex: 2, message: "The last event really helped with that" },
    { userIndex: 3, message: "Should we plan another one for December?" },
    { userIndex: 4, message: "Good idea, let's discuss dates next week" }
  ],
  'general': [
    { userIndex: 0, message: "Hello everyone! How's it going?" },
    { userIndex: 1, message: "Doing well, thanks for asking!" },
    { userIndex: 2, message: "Anyone have exciting plans for the weekend?" },
    { userIndex: 3, message: "I'm just going to relax and watch some games" },
    { userIndex: 4, message: "The weather has been great lately" },
    { userIndex: 0, message: "Has anyone seen any good movies recently?" },
    { userIndex: 1, message: "That new action movie is worth watching" },
    { userIndex: 2, message: "I prefer comedies myself" },
    { userIndex: 3, message: "Let's recommend some good books too" },
    { userIndex: 4, message: "How about we share our favorite recipes?" }
  ]
};

console.log();
console.log('🌱 Starting database seeding...');

// MongoDB connection with error handling
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/socketioChat', {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });
    console.log();
    console.log('🟢 Connected to MongoDB');
  } catch (err) {
    console.error('🔴 MongoDB connection error:', err.message);
    process.exit(1);
  }
};

const seedDatabase = async () => {
  try {
    await connectDB();

    // Clear existing data
    await User.deleteMany({});
    await Room.deleteMany({});
    await Message.deleteMany({});

    // Create users with delays
    const users = [];
    const rawCredentials = [];
    
    console.log('👤 Creating 15 users...');
    console.log();
    for (let i = 0; i < 15; i++) {
      try {
        const firstName = kenyanFirstNames[i];
        const lastName = kenyanLastNames[i];
        const username = `${firstName.toLowerCase()}_${lastName.toLowerCase()}`;
        const password = Math.random().toString(36).slice(-8);

        const user = new User({ 
          username, 
          password
        });
        
        await user.save();
        
        users.push(user);
        rawCredentials.push({ username, password, name: `${firstName} ${lastName}` });
        console.log(`➕ Created user ${username}`);
        
        // Add 500ms delay between creations
        if (i < 14) await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`⚠️ Error creating user ${i+1}:`, error.message);
      }
    }

    // Create only the 5 specific rooms
    const roomNames = ['general', 'arsenal', 'man-u', 'liverpool', 'bedsa'];
    const roomTopics = [
      'General Chat',
      'Arsenal FC Discussions',
      'Manchester United FC',
      'Liverpool FC Fan Club',
      'BEDSA Community'
    ];
    
    const rooms = [];
    console.log('\n🚪 Creating 5 specific rooms...');
    console.log();
    
    for (let i = 0; i < 5; i++) {
      try {
        // Assign 5 users to each room
        const participants = [];
        const startIndex = i * 3; // Distribute users across rooms
        for (let j = 0; j < 5; j++) {
          const userIndex = (startIndex + j) % users.length;
          participants.push(users[userIndex]._id);
        }

        const room = new Room({
          name: roomNames[i],
          isPrivate: false,
          participants,
          createdBy: participants[0], // First participant is creator
          topic: roomTopics[i]
        });
        
        await room.save();
        rooms.push(room);
        console.log(`➕ Created room ${roomNames[i]} (${roomTopics[i]}) with 5 participants`);
        
        // Add 500ms delay between creations
        if (i < 4) await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`⚠️ Error creating room ${roomNames[i]}:`, error.message);
      }
    }

    // Create realistic conversations for each room
    console.log('\n💬 Creating realistic conversations for each room...');
    console.log();
    
    for (const room of rooms) {
      try {
        const roomName = room.name;
        const participants = room.participants;
        
        // Get the conversation flow for this room
        const flow = conversationFlows[roomName] || conversationFlows['general'];
        
        // Create each message in the conversation flow
        for (const messageData of flow) {
          const sender = participants[messageData.userIndex % participants.length];
          const senderUser = users.find(u => u._id.equals(sender));
          
          const message = new Message({
            content: messageData.message,
            username: senderUser.username,
            room: room._id,
            roomName: room.name,
            time: new Date(),
            file: null, // Simplified file field
            readBy: [senderUser.username],
            deletedFor: []
          });

          await message.save();
          console.log(`   ➕ Added message to ${room.name} from ${senderUser.username}: "${messageData.message}"`);
          
          // Small delay between messages to simulate real conversation
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (error) {
        console.error(`⚠️ Error creating messages for room ${room.name}:`, error.message);
      }
    }

    console.log('\n✅ Seeding completed successfully!');
    console.log();
    console.log('📋 User credentials (pre-hash):');
    console.table(rawCredentials);

    console.log('\n💾 Database Summary:');
    console.log(`   👤 Users created: ${users.length}`);
    console.log(`   🚪 Rooms created: ${rooms.length}`);
    const messageCount = rooms.reduce((sum, room) => sum + (conversationFlows[room.name] || conversationFlows['general']).length, 0);
    console.log(`   ✉️ Messages created: ${messageCount}`);
    console.log();

  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

seedDatabase();