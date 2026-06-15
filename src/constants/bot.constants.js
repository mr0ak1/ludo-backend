// Bot Difficulty Levels
const BOT_DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
};

// Bot Levels Array (for validation)
const BOT_LEVELS = ['easy', 'medium', 'hard'];

// All Bot Names - Comprehensive list
const ALL_BOT_NAMES = [
  'Abhishek Kumar', 'Rahul Sharma', 'Aman Verma', 'Rohit Singh', 'Aditya Yadav', 'Vikash Patel', 'Arjun Mehta', 'Karan Gupta',
  'Mohit Joshi', 'Sandeep Mishra', 'Nitin Agarwal', 'Rajesh Kumar', 'Pankaj Tiwari', 'Sumit Chauhan', 'Deepak Yadav', 'Ankit Sharma',
  'Vivek Pandey', 'Manish Kumar', 'Ajay Thakur', 'Sachin Verma', 'Priya Sharma', 'Anjali Verma', 'Pooja Singh', 'Neha Yadav',
  'Sneha Patel', 'Kavita Sharma', 'Riya Gupta', 'Simran Kaur', 'Aarti Mishra', 'Nisha Kumari', 'Tanya Jain', 'Muskan Sharma',
  'Payal Verma', 'Komal Singh', 'Shreya Gupta', 'Meera Joshi', 'Divya Patel', 'Nikita Yadav', 'Sakshi Sharma', 'Isha Mehta',
  'Abhinav Kumar', 'Akash Sharma', 'Alok Verma', 'Amarjeet Singh', 'Amit Patel', 'Anand Mishra', 'Anurag Tiwari', 'Ashish Gupta',
  'Ayush Yadav', 'Bhavesh Patel', 'Chetan Sharma', 'Chirag Jain', 'Deepanshu Kumar', 'Devendra Singh', 'Dheeraj Verma', 'Gaurav Sharma',
  'Harsh Kumar', 'Himanshu Yadav', 'Imran Khan', 'Jatin Mehta', 'Keshav Sharma', 'Lalit Verma', 'Lokesh Yadav', 'Madhav Gupta',
  'Mayank Singh', 'Mukesh Kumar', 'Naveen Sharma', 'Nikhil Verma', 'Omprakash Yadav', 'Pradeep Kumar', 'Prashant Sharma', 'Rahul Chauhan',
  'Rajat Gupta', 'Rajiv Sharma', 'Rakesh Kumar', 'Rohan Verma', 'Sagar Patel', 'Sahil Sharma', 'Sanjay Kumar', 'Sarthak Gupta',
  'Shivam Yadav', 'Shubham Singh', 'Siddharth Sharma', 'Sonu Kumar', 'Sourabh Verma', 'Sumit Sharma', 'Tarun Gupta', 'Uday Singh',
  'Varun Sharma', 'Vikas Kumar', 'Vinay Yadav', 'Vishal Sharma', 'Vivek Gupta', 'Yash Patel', 'Yusuf Khan', 'Zaid Ali',
  'Aarohi Sharma', 'Aditi Verma', 'Akanksha Gupta', 'Amrita Singh', 'Ananya Sharma', 'Ankita Verma', 'Bhavna Patel', 'Charu Gupta',
  'Deepika Sharma', 'Divya Singh', 'Ekta Verma', 'Garima Sharma', 'Harshita Gupta', 'Ishita Sharma', 'Jyoti Verma', 'Kajal Singh',
  'Kanika Gupta', 'Khushi Sharma', 'Kritika Verma', 'Mahima Singh', 'Monika Sharma', 'Nandini Gupta', 'Navya Sharma', 'Palak Verma',
  'Prachi Singh', 'Preeti Sharma', 'Radhika Gupta', 'Rashmi Verma', 'Ritika Sharma', 'Saloni Gupta', 'Sana Khan', 'Shivani Verma',
  'Shruti Sharma', 'Sonali Gupta', 'Tanisha Verma', 'Tanu Sharma', 'Vaishnavi Gupta', 'Vanshika Sharma', 'Yamini Verma', 'Sundar Tiwari',
  'Rajesh Sharma', 'Amit Verma', 'Vikram Singh', 'Suresh Gupta', 'Ramesh Yadav', 'Pradeep Kumar', 'Ashok Mishra', 'Manish Dubey',
  'Sanjay Pandey', 'Ravi Sharma', 'Deepak Agarwal', 'Sanjeev Tiwari', 'Mahesh Verma', 'Arun Mishra', 'Mohan Sharma', 'Nitin Trivedi',
  'Ashish Jain', 'Shyam Tiwari', 'Vinod Kumar', 'Ajay Mishra', 'Naresh Yadav', 'Sunil Gupta', 'Yashwant Singh', 'Chetan Verma',
  'Dinesh Kumar', 'Manoj Gupta', 'Pankaj Mishra', 'Harish Sharma', 'Anil Kumar', 'Sagar Verma', 'Jitendra Tiwari', 'Pawan Kumar',
  'Umesh Sharma', 'Gopal Mishra', 'Mahendra Singh', 'Bhupendra Yadav', 'Kailash Sharma', 'Arvind Tiwari', 'Yogesh Verma', 'Prakash Sharma',
  'Kiran Kumar', 'Brijesh Sharma', 'Chandra Mouli', 'Brahmanand Tiwari', 'Hare Krishna', 'Balkrishna Sharma', 'Gauri Shankar', 'Jagdish Sharma',
  'Kedar Nath', 'Mohan Lal', 'Narayan Tiwari', 'Raghunath Sharma', 'Sita Ram', 'Shankar Lal', 'Shiv Shankar', 'Thakur Singh',
  'Uday Shankar', 'Vishwanath Tiwari', 'Yashpal Sharma', 'Aryan Singh', 'Aakash Verma', 'Ayush Kumar', 'Ishaan Tiwari', 'Khushi Ram',
  'Abhiraj Sharma', 'Sai Krishna', 'Kshitij Gupta', 'Samarth Mishra', 'Atharv Sharma', 'Vedant Verma', 'Aditya Tiwari', 'Vihan Sharma',
  'Reyansh Singh', 'Vivaan Kumar', 'Arnav Gupta', 'Kartik Sharma', 'Advay Mishra', 'Anvit Verma', 'Aarav Tiwari', 'Vihaan Sharma',
  'Rahul Verma', 'Saurabh Sharma', 'Paras Tiwari', 'Yash Singh', 'Devang Kumar', 'Siddharth Sharma', 'Meet Mishra', 'Naman Verma',
  'Zayan Tiwari', 'Kabir Sharma', 'Gautam Singh', 'Nishant Kumar', 'Akshay Gupta', 'Ishaq Ansari', 'Risley Singh', 'Sameer Khan',
  'Bilal Ahmed', 'Aatif Rehman', 'Shoaib Akhtar', 'Junaid Khan', 'Wasim Akram', 'Ajmal Ansari', 'Rehman Khan', 'Zuber Ahmed',
  'Faisal Khan', 'Prem Chand', 'Vijay Singh', 'Raghav Sharma', 'Harsh Yadav', 'Karan Verma', 'Pratik Mishra', 'Tushar Sharma',
  'Mayank Kumar', 'Rohan Sharma', 'Akhil Gupta', 'Ankur Mishra', 'Ashutosh Yadav', 'Dheeraj Verma', 'Jatin Gupta', 'Kavan Shah',
  'Kunal Sharma', 'Lavish Verma', 'Mehul Tiwari', 'Nalin Kumar', 'Ojaswi Verma', 'Pranav Sharma', 'Porus Patel', 'Qamar Khan',
  'Samar Verma', 'Tejas Tiwari', 'Utkarsh Mishra', 'Vaibhav Sharma', 'Yadvendra Yadav', 'Zakaulla Khan', 'Aamir Khan', 'Arif Ansari',
  'Bashir Ahmed', 'Danish Khan', 'Ejaz Ansari', 'Faheem Khan', 'Ghulam Nabi', 'Aslam Khan', 'Hamza Qureshi', 'Ismail Ansari',
  'Kaleem Ansari', 'Manzoor Ahmed', 'Nadeem Khan', 'Naushad Khan', 'Saeed Khan', 'Sohaib Khan', 'Tariq Jamali', 'Umar Farooq',
  'Waqar Zaka', 'Yasir Shah', 'Zamir Ahmed', 'Amna Khan', 'Asma Beg', 'Ayesha Khan', 'Bilqiess Khan', 'Farhat Khan',
  'Hina Khan', 'Iqra Khan', 'Jehan Ara', 'Kiran Khan', 'Laila Khan', 'Marina Khan', 'Nida Khan', 'Noor Fatima',
  'Sameena Khan', 'Shabana Khan', 'Tahira Khan', 'Uzma Khan', 'Wajiha Ahmed', 'Zainab Khan', 'Zoya Khan', 'Zareen Khan',
  'Athiya Verma', 'Diya Sharma', 'Ekta Singh', 'Farhiya Khan', 'Gauri Mishra', 'Hema Malini', 'Ira Singh', 'Jigyasa Verma',
  'Kavya Tiwari', 'Lavanya Gupta', 'Meenakshi Sharma', 'Mahak Verma', 'Navya Singh', 'Oviya Khan', 'Priyanka Verma', 'Qurat-ul-Ain',
  'Ritu Sharma', 'Tripti Verma', 'Ujala Devi', 'Vanya Khanna', 'Wafa Ali', 'Zaina Beg', 'Aastha Sharma', 'Arpita Verma',
  'Bhavna Singh', 'Chandni Tiwari', 'Disha Sharma', 'Eliza Khan', 'Fatima Khan', 'Garima Verma', 'Heena Khan', 'Ila Mishra',
  'Jhanvi Sharma', 'Kamya Verma', 'Lata Devi', 'Meher Khan', 'Nidhi Sharma', 'Opal Verma', 'Pammi Devi', 'Qasmin Khan',
  'Rhea Jain', 'Sanya Singh', 'Tania Khan', 'Urmi Devi', 'Violette Khan', 'Wahaab Khan', 'Yashaswi Verma', 'Zahra Khan',
  'Aditi Sharma', 'Baani Singh', 'Chetna Verma', 'Durga Devi', 'Esha Gupta', 'Falguni Jain', 'Gauri Khanna', 'Harpreet Kaur',
  'Indira Devi', 'Janhavi Sharma', 'Komal Verma', 'Leena Devi', 'Manali Singh', 'Nagma Khan', 'Ojasvi Verma', 'Parminder Kaur',
  'Queensha Khan', 'Roshni Verma', 'Seema Devi', 'Trisha Sharma', 'Urmila Devi', 'Varsha Sharma', 'Vijayalakshmi', 'Waris Khan',
  'Yesha Sharma', 'Zoya Beg', 'Akshara Sharma', 'Bindu Devi', 'Chitrangada Tamang', 'Darshini Verma', 'Erum Khan', 'Gitanjali Devi',
  'Humaira Khan', 'Ishani Sharma', 'Jyoti Devi', 'Kanishka Jain', 'Leela Devi', 'Madhvi Sharma', 'Nandini Verma', 'Pooja Sharma',
  'Qamar Fatima', 'Ratna Devi', 'Shilpa Verma', 'Trupti Sharma', 'Usha Devi', 'Vandana Kumar', 'Wardah Khan', 'Yashoda Devi',
  'Zulekha Khan', 'Aanchal Sharma', 'Bharti Devi', 'Chhakki Devi', 'Divya Verma', 'Essha Khan', 'Fariha Khan', 'Geeta Devi',
  'Honey Sharma', 'Idrees Khan', 'Janaki Devi', 'Kashmira Singh', 'Latika Sharma', 'Mamta Devi', 'Neha Verma', 'Oindrilla Sharma',
  'Pallavi Verma', 'Raima Khan', 'Sonam Kaur', 'Tanvi Sharma', 'Uttara Devi', 'Vibha Sharma', 'Wasim Khan', 'Yamini Devi',
  'Zarina Khan', 'Anjali Verma', 'Bhanu Devi', 'Chandrika Sharma', 'Dipti Verma', 'Eshaal Khan', 'Fiza Khan', 'Ganga Devi',
  'Himani Sharma', 'Ishita Verma', 'Juhi Sharma', 'Kanchan Devi', 'Laxmi Devi', 'Mini Sharma', 'Naina Verma', 'Pankhuri Sharma',
  'Quratulain', 'Ratna Verma', 'Sunitha Devi', 'Tanya Sharma', 'Urmila Sharma', 'Vimla Devi', 'Wajida Khan', 'Yamuna Devi',
  'Zarina Beg', 'Aarti Sharma', 'Babli Devi', 'Chandana Verma', 'Dolly Sharma', 'Farheen Khan', 'Gemi Devi', 'Hariyani Sharma',
  'Indu Devi', 'Janvi Verma', 'Kavita Sharma', 'Leela Verma', 'Minakshi Devi', 'Nisha Verma', 'Parul Verma', 'Rampyari Devi',
  'Sangeeta Verma', 'Tulsi Devi', 'Vanita Sharma', 'Waseem Khan', 'Zeba Khan', 'Abha Sharma', 'Bhavani Devi', 'Divyani Verma',
  'Faiza Khan', 'Geetanjali Devi', 'Hema Verma', 'Jyotsana Verma', 'Kalpana Devi', 'Madhu Sharma', 'Nalini Devi', 'Omisha Verma',
  'Pragya Sharma', 'Qurratulain Khan', 'Renu Devi', 'Sucheta Verma', 'Tilok Devi', 'Vinita Sharma', 'Yamini Verma', 'Zoya Sharma',
  'Anamika Verma', 'Alok Mishra', 'Bhanu Pratap', 'Chinni Lal', 'Dhananjay Singh', 'Eknath Jadhav', 'Faiyaz Khan', 'Gajender Yadav',
  'Hari Bhakti', 'Iqbal Ahmed', 'Jai Prakash', 'Kameshwar Tiwari', 'Lallan Singh', 'Mahendra Pal', 'Narottam Mishra', 'Pyare Lal',
  'Qamaruzzaman', 'Ramdhari Singh', 'Shashi Bhushan', 'Tarachand Sharma', 'Umesh Tiwari', 'Virendra Singh', 'Wasim Rahman', 'Yashpal Tiwari',
  'Zahid Khan', 'Abdul Bari', 'Bhola Nath', 'Chand Ram', 'Dinanath Tiwari', 'Faizan Ansari', 'Govind Das', 'Harish Chandra',
  'Israr Ahmed', 'Javed Ansari', 'Karan Veer', 'Leela Ram', 'Madhav Peethambar', 'Nisar Ahmed', 'Ortega Singh', 'Pandit Dulare',
  'Qadir Bakhsh', 'Raghbir Singh', 'Shiv Narayan', 'Tejpal Singh', 'Umakant Tripathi', 'Vijayendra Singh', 'Wahid Khan', 'Xerxes Patel',
  'Yashodhan Sharma', 'Zahoor Ahmad', 'Aftab Alam', 'Baldev Singh', 'Chetan Bhagat', 'Durgawati Devi', 'Ehsanul Haq', 'Firoz Khan',
  'Ganesh Prasad', 'Hridayesh Tiwari', 'Irshad Ahmed', 'Jagruthi Sharma', 'Krishan Kumar', 'Laxmi Kant', 'Mahabir Yadav', 'Neelkant Tripathi',
  'Omkar Nath', 'Parmanand Tyagi', 'Qurban Ali', 'Ratan Lal', 'Shiva Shankar', 'Trinath Sharma', 'Uday Bhaneja', 'Virendra Kumar',
  'Wasiq Ahmed', 'Yunus Khan', 'Zaheer Khan', 'Awadhesh Tiwari', 'Bharat Singh', 'Champa Devi', 'Dinesh Prasad', 'Enamul Haque',
  'Fakruddin Ansari', 'Girdhari Lal', 'Hari Om', 'Irfan Ahmed', 'Jawahar Lal', 'Kapil Dev', 'Lalan Kumar', 'Mahfooz Khan',
  'Nand Kishore', 'Omkar Tiwari', 'Pardeshi Singh', 'Qurban Hussain', 'Rameshwar Nath', 'Shivratri Devi', 'Tilak Raj', 'Ugra Sen',
  'Vajubhai Patel', 'Wajid Khan', 'Yogender Yadav', 'Zafar Ali', 'Ajit Singh', 'Balaji Rao', 'Cherry Sharma', 'Dhanpat Rai',
  'Farhan Ahmed', 'Gagan Deep', 'Harbhajan Singh', 'Ishwar Prasad', 'Jaspal Singh', 'Kamal Nath', 'Lalit Kumar', 'Maheshwari Devi',
  'Naresh Tiwari', 'Preetam Singh', 'Quazi Rahman', 'Rajender Yadav', 'Sagarika Devi', 'Thanwar Singh', 'Udit Narayan', 'Virendra Tiwari',
  'Wajahat Khan', 'Yatin Sharma', 'Zahra Hussain', 'Akbar Ali', 'Buddhi Lal', 'Charulata Devi', 'Durgesh Tiwari', 'Emraan Hashmi',
  'Fazal Rahman', 'Gopi Krishna', 'Hamid Ansari', 'Ishaq Khan', 'Jitendra Singh', 'Kamlesh Tiwari', 'Lachman Das', 'Mahendra Kumar',
  'Narender Yadav', 'Pradeep Tiwari', 'Quasim Khan', 'Rajiv Ranjan', 'Sukhwinder Singh', 'Taarak Mehta', 'Udayan Sharma', 'Venkatesh Rao',
  'Waris Ali', 'Yasir Ahmed', 'Zahir Khan', 'Ajay Trivedi', 'Balwant Singh', 'Chanda Devi', 'Deepankar Tiwari', 'Erum Fatima',
  'Faheem Ansari', 'Govindram Sharma', 'Hirdesh Tiwari', 'Ilyas Khan', 'Jugal Kishore', 'Kishore Kumar', 'Madan Lal', 'Nizamuddin Ansari',
  'Oyeronke Sharma', 'Praveen Tiwari', 'Qureshi Khan', 'Radhe Shyam', 'Santosh Kumar', 'Tiger Shroff', 'Udai Pratap', 'Vishwanath Rao',
  'Waseem Ahmed', 'Yasmin Khan', 'Zain Ali', 'Anil Trivedi', 'Bhopendra Nath', 'Chanchal Devi', 'Deven Verma', 'Farheen Fatima',
  'Ghanshyam Das', 'Hemant Kumar', 'Ismat Ara', 'Jivan Tiwari', 'Kailash Chandra', 'Lalu Prasad', 'Meenakshi Devi', 'Naushad Ali',
  'Parmeshwari Devi', 'Qamid Khan', 'Ramkumar Sharma', 'Sushil Kumar', 'Tahir Khan', 'Usha Rani', 'Vishal Tiwari', 'Wali Rahman',
  'Yash Raj', 'Zeeshan Ali', 'Arvind Trivedi', 'Birendra Kumar', 'Charu Mehta', 'Devender Singh', 'Faisal Rehman', 'Govind Rao',
  'Hari Shankar', 'Ishaq Ansari', 'Jyoti Prakash', 'Kailas Nath', 'Lutfullah Khan', 'Madhukar Tiwari', 'Naved Ahmed', 'Omi Vaidya',
  'Pankaj Trivedi', 'Qayyum Ansari', 'Rakesh Tiwari', 'Sanjay Trivedi', 'Thanuja Devi', 'Uday Kumar', 'Vivek Tiwari', 'Waqar Ahmed',
  'Yasir Khan', 'Zahra Khan', 'Aman Trivedi', 'Bhavesh Sharma', 'Chetan Tiwari', 'Dhruv Rathee', 'Enan Khan', 'Faiyaz Ahmad',
  'Ganesh Tiwari', 'Himesh Reshammiya', 'Imran Khan', 'Jatinder Singh', 'Kavya Trivedi', 'Laxman Naik', 'Mangesh Khan', 'Nabin Tiwari',
  'Ojas Sharma', 'Paras Nath', 'Qamarul Islam', 'Ranjan Kumar', 'Shabbir Khan', 'Tejas Tiwari', 'Utkarsh Trivedi', 'Vipin Kumar',
  'Wajid Ali', 'Yash Trivedi', 'Zeenat Aman', 'Aadesh Sharma', 'Bharat Bhushan', 'Chandan Tiwari', 'Drishti Sharma', 'Eqbal Ansari',
  'Faheem Khan', 'Girish Tiwari', 'Hardeep Singh', 'Idris Khan', 'Jatavendra Singh', 'Kabir Khan', 'Love Kumar', 'Madhuri Dixit',
  'Navin Tiwari', 'Ojaswi Sharma', 'Parvati Devi', 'Qaiser Khan', 'Raveena Tandon', 'Shalini Trivedi', 'Tribhuvan Nath', 'Urmila Matondkar',
  'Vishwa Mohan', 'Wahab Khan', 'Yashpal Sharma', 'Zaroon Khan', 'Adesh Kumar', 'Bhupinder Singh', 'Chhaya Devi', 'Divyanka Tripathi',
  'Enam Khan', 'Fayyaz Ahmed', 'Gaurav Tiwari', 'Harish Tiwari', 'Isha Gupta', 'Jai Kishan', 'Kasturi Sharma', 'Luv Kumar',
  'Manoj Tiwari', 'Nasir Khan', 'Oviya Devi', 'Pardeep Kumar', 'Rana Tiwari', 'Shilpa Shetty', 'Tejpal Tiwari', 'Ujjwal Kumar',
  'Vibha Anand', 'Waheed Khan', 'Yash Tiwari', 'Zakir Khan', 'Anshul Sharma', 'Buffinder Singh', 'Chandrika Devi', 'Divyang Tiwari',
  'Eliza John', 'Faroqui Khan', 'Ganpat Tiwari', 'Harmeet Singh', 'Inayat Khan', 'Javed Akhtar', 'Kalyan Tiwari', 'Labh Janjua',
  'Mukesh Tiwari', 'Najma Khan', 'Oorja Tiwari', 'Parmeet Singh', 'Qaiser Waheed', 'Ragini Tiwari', 'Shahnawaz Khan', 'Tejaswi Devi',
  'Udayan Tiwari', 'Vivan Bhatt', 'Wasim Khan', 'Yashpal Tiwari', 'Zuber Khan', 'Amitabh Bachchan', 'Barun Sobti', 'Chitrangada Singh',
  'Deepika Padukone', 'Esha Gupta', 'Faiza Khan', 'Guru Mann', 'Irrfan Khan', 'Janhvi Kapoor', 'Karishma Tanna', 'Lalu Khan',
  'Mango Sharma', 'Neha Dhupia', 'Oviya Daniel', 'Parineeti Chopra', 'Queen Huda', 'Rajkummar Rao', 'Shraddha Kapoor', 'Taapsee Pannu',
  'Urvashi Rautela', 'Vicky Kaushal', 'Waruna Khan', 'Yami Gautam', 'Zarina Wahab', 'Ajay Devgn', 'Blueshaar Singh', 'Chandrodaya Devi',
  'Dipika Kakar', 'Eijaz Khan', 'Faheem Ansari', 'Gauri Khan', 'Himanshu Tiwari', 'Imran Abbas', 'Jaggi Yaroslav', 'Kenisha Devi',
  'Lokendra Singh', 'Meiyang Chang', 'Obaid Sidique', 'Poonam Pisal', 'Raghav Juyal', 'Shadab Khan', 'Tinu Anand', 'Ushoshi Sen',
  'Vivan Shah', 'Walid Ahmad', 'Yash Tonk', 'Zaina Jehan', 'Anjali Arora', 'Bitto Ramsey', 'Chhaya Kadam', 'Disha Parmar',
  'Eisha Singh', 'Fahad Khan', 'Gippy Grewal', 'Harsh Beniwal', 'Ishita Raj', 'Jhanak Shukla', 'Karan V Grover', 'Luv Sinha',
  'Mouni Roy', 'Nakuul Mehta', 'Ojaswi Ale', 'Pavitra Punia', 'Rohanpreet Singh', 'Surbhi Chandna', 'Tufail Khan', 'Udit Nyayan',
  'Vicky Ahja', 'Waseem Mir', 'Yashpathi Sirohi', 'Zain Imam', 'Ayesha Kapoor', 'Babban Khan', 'Chinky Ahuja', 'Divya Dutta',
];

const normalizeBotName = (name) => String(name || '').replace(/\s+/g, ' ').trim();

const UNIQUE_BOT_NAMES = Array.from(
  new Set(ALL_BOT_NAMES.map(normalizeBotName).filter(Boolean))
);

let availableBotNames = [];

function shuffleBotNames(names) {
  const shuffled = [...names];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

function refillBotNamePool() {
  availableBotNames = shuffleBotNames(UNIQUE_BOT_NAMES);
}

/**
 * Get next bot name as a random non-repeating value
 * @returns {String} Next bot name from the shuffled pool
 */
function getRandomUniqueBotName() {
  if (availableBotNames.length === 0) {
    refillBotNamePool();
  }

  return availableBotNames.pop();
}

/**
 * Backward-compatible alias for random unique naming
 * @returns {String} Next bot name from the shuffled pool
 */
function getNextBotName() {
  return getRandomUniqueBotName();
}

/**
 * Reset bot name pool (for testing/admin)
 */
function resetBotNameCounter() {
  availableBotNames = [];
}

// Bot Names - Indian names for authentic feel (Grouped by difficulty for legacy support)
const BOT_NAMES = {
  EASY: ALL_BOT_NAMES,
  MEDIUM: ALL_BOT_NAMES,
  HARD: ALL_BOT_NAMES,
};

// Bot Move Strategies - Priority Order
const BOT_STRATEGIES = {
  EASY: {
    // Random moves, basic logic
    RANDOM_MOVE: 0.8,
    AVOID_DANGER: 0.2,
  },
  MEDIUM: {
    // Balanced strategy
    KILL_OPPONENT: 0.3,
    PROTECT_OWN_TOKEN: 0.3,
    ADVANCE_HOME: 0.4,
  },
  HARD: {
    // Advanced strategy
    KILL_OPPONENT: 0.4,
    BLOCK_OPPONENT: 0.2,
    ADVANCE_HOME: 0.3,
    PROTECT_TOKEN: 0.1,
  },
};

// Bot Decision Making Rules
const BOT_RULES = {
  PRIORITIZE_KILL: true,
  PRIORITIZE_HOME_ENTRY: true,
  AVOID_DANGER_ZONES: true,
  CALCULATE_LOOKAHEAD_MOVES: true,
};

// Bot Thinking Time (milliseconds)
const BOT_THINKING_TIME = {
  EASY: 1000, // 1 second
  MEDIUM: 1500, // 1.5 seconds
  HARD: 2000, // 2 seconds
};

// Bot Move Analysis
const BOT_MOVE_ANALYSIS = {
  CONSIDER_FUTURE_MOVES: 3, // Look ahead 3 moves
  EVALUATE_RISK: true,
  CALCULATE_WINNING_PROBABILITY: true,
};

// Fake Player Stats for Realistic Experience
const BOT_FAKE_STATS = {
  EASY: {
    wins: () => Math.floor(Math.random() * 50) + 10,        // 10-60 wins
    losses: () => Math.floor(Math.random() * 80) + 20,       // 20-100 losses
    totalGames: function() { return this.wins() + this.losses(); },
    winRate: function() { 
      const total = this.totalGames();
      return total > 0 ? Math.round((this.wins() / total) * 100) : 0;
    },
    coins: () => Math.floor(Math.random() * 500) + 100,      // 100-600 coins
    level: () => Math.floor(Math.random() * 5) + 1,          // Level 1-5
  },
  MEDIUM: {
    wins: () => Math.floor(Math.random() * 150) + 50,        // 50-200 wins
    losses: () => Math.floor(Math.random() * 150) + 50,      // 50-200 losses
    totalGames: function() { return this.wins() + this.losses(); },
    winRate: function() { 
      const total = this.totalGames();
      return total > 0 ? Math.round((this.wins() / total) * 100) : 45;
    },
    coins: () => Math.floor(Math.random() * 2000) + 500,     // 500-2500 coins
    level: () => Math.floor(Math.random() * 5) + 6,          // Level 6-10
  },
  HARD: {
    wins: () => Math.floor(Math.random() * 300) + 200,       // 200-500 wins
    losses: () => Math.floor(Math.random() * 100) + 50,      // 50-150 losses
    totalGames: function() { return this.wins() + this.losses(); },
    winRate: function() { 
      const total = this.totalGames();
      return total > 0 ? Math.round((this.wins() / total) * 100) : 75;
    },
    coins: () => Math.floor(Math.random() * 5000) + 2000,    // 2000-7000 coins
    level: () => Math.floor(Math.random() * 5) + 11,         // Level 11-15
  },
};

// Matchmaking Configuration
const MATCHMAKING_CONFIG = {
  FAKE_QUEUE_DELAY_MIN: 1000,        // 1 second minimum wait
  FAKE_QUEUE_DELAY_MAX: 7000,        // 7 seconds maximum wait
  QUEUE_TIMEOUT: 10 * 60 * 1000,     // 10 minutes queue timeout
};

module.exports = {
  BOT_DIFFICULTY,
  BOT_LEVELS,
  ALL_BOT_NAMES,
  BOT_NAMES,
  BOT_STRATEGIES,
  BOT_RULES,
  BOT_THINKING_TIME,
  BOT_MOVE_ANALYSIS,
  BOT_FAKE_STATS,
  MATCHMAKING_CONFIG,
  getRandomUniqueBotName,
  getNextBotName,
  resetBotNameCounter,
};
