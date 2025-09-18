-- إدراج المزيد من المقالات الإنجليزية
-- Insert More English Articles

DO $$
DECLARE
    relationship_psychology_id UUID;
    health_wellness_id UUID;
    success_stories_id UUID;
    cultural_traditions_id UUID;
    marriage_tips_id UUID;
    author_id UUID;
BEGIN
    -- الحصول على معرفات التصنيفات
    SELECT id INTO relationship_psychology_id FROM article_categories WHERE name = 'Relationship Psychology' AND language = 'en';
    SELECT id INTO health_wellness_id FROM article_categories WHERE name = 'Health & Wellness' AND language = 'en';
    SELECT id INTO success_stories_id FROM article_categories WHERE name = 'Success Stories' AND language = 'en';
    SELECT id INTO cultural_traditions_id FROM article_categories WHERE name = 'Cultural Traditions' AND language = 'en';
    SELECT id INTO marriage_tips_id FROM article_categories WHERE name = 'Marriage Tips' AND language = 'en';
    
    -- الحصول على معرف مؤلف
    SELECT id INTO author_id FROM users LIMIT 1;
    
    -- إدراج المقالات
    INSERT INTO articles (
        title, excerpt, content, author_id, category_id, tags, 
        published_at, read_time, views, likes, comments_count, featured, status, language
    ) VALUES 

    -- Relationship Psychology Articles
    (
        'Understanding Love Languages in Islamic Marriage',
        'Discover how the five love languages can strengthen your Islamic marriage and improve emotional connection between spouses.',
        '# Understanding Love Languages in Islamic Marriage

## 💝 Introduction

The concept of love languages, developed by Dr. Gary Chapman, can be beautifully integrated with Islamic principles to strengthen marital bonds and improve communication between spouses.

## 🗣️ The Five Love Languages

### 1. Words of Affirmation
**Islamic Perspective:** The Prophet (peace be upon him) emphasized the importance of kind words.

**In Marriage:**
- Express appreciation for your spouse''s efforts
- Give sincere compliments
- Offer encouragement during difficult times
- Use pet names and terms of endearment
- Acknowledge their contributions to the family

**Islamic Examples:**
- "May Allah reward you for your kindness"
- "You are a blessing in my life"
- "I appreciate how you care for our family"

### 2. Quality Time
**Islamic Perspective:** Spending meaningful time together strengthens the marital bond.

**In Marriage:**
- Have regular one-on-one conversations
- Pray together
- Take walks and enjoy nature
- Share meals without distractions
- Engage in activities you both enjoy

**Islamic Activities:**
- Reading Quran together
- Attending Islamic lectures
- Making dua together
- Discussing Islamic topics

### 3. Physical Touch
**Islamic Perspective:** Islam encourages appropriate physical affection between spouses.

**In Marriage:**
- Hold hands while walking
- Gentle touches throughout the day
- Hugs and embraces
- Sitting close to each other
- Massage and physical comfort

**Islamic Guidelines:**
- Maintain modesty in public
- Be considerate of your spouse''s comfort level
- Physical affection as an expression of love and care

### 4. Acts of Service
**Islamic Perspective:** Serving your spouse is a form of worship and love.

**In Marriage:**
- Help with household chores
- Prepare favorite meals
- Take care of responsibilities
- Support during illness
- Assist with personal goals

**Islamic Examples:**
- The Prophet (peace be upon him) helped with household tasks
- Serving your spouse with the intention of pleasing Allah
- Making life easier for your partner

### 5. Receiving Gifts
**Islamic Perspective:** Gift-giving is encouraged in Islam to strengthen relationships.

**In Marriage:**
- Thoughtful presents on special occasions
- Small surprises to show you care
- Gifts that reflect their interests
- Handmade items with personal touch
- Experiences rather than just material items

**Islamic Guidance:**
- "Give gifts to one another, for gifts take away rancor" (Hadith)
- The value is in the thought, not the price
- Gifts as expressions of gratitude and love

## 🔍 Discovering Your Spouse''s Love Language

### Observation Methods
- Notice what they request most often
- Observe what they complain about
- Watch how they express love to others
- Pay attention to what makes them happiest
- Ask directly about their preferences

### Communication Strategies
- Have open discussions about needs
- Share your own love language
- Be patient as you both learn
- Adjust your approach based on feedback
- Make it a fun discovery process

## 🤝 Applying Love Languages in Islamic Marriage

### Daily Practices
- Start each day with words of affirmation
- Schedule quality time together
- Show physical affection appropriately
- Perform acts of service willingly
- Give small gifts regularly

### During Conflicts
- Use their love language to reconcile
- Avoid withholding their primary love language
- Express apologies in their preferred way
- Show extra effort in their love language
- Seek forgiveness through loving actions

### Special Occasions
- Celebrate using their love language
- Plan surprises based on their preferences
- Make holidays and anniversaries meaningful
- Create traditions that speak their language
- Involve extended family appropriately

## 🌟 Islamic Benefits of Understanding Love Languages

### Strengthening the Marriage Bond
- Increased emotional intimacy
- Better communication
- Reduced misunderstandings
- Greater satisfaction for both spouses
- Stronger foundation for family life

### Spiritual Benefits
- Serving your spouse becomes worship
- Following the Prophet''s example
- Creating a peaceful home environment
- Raising children in a loving atmosphere
- Building a marriage that pleases Allah

## 🚧 Common Challenges and Solutions

### Different Love Languages
- Learn to speak your spouse''s language
- Don''t expect them to change theirs
- Find compromises that work for both
- Appreciate the differences
- Grow together in understanding

### Cultural Considerations
- Respect cultural expressions of love
- Adapt love languages to your context
- Involve family appropriately
- Balance individual and cultural needs
- Create your own family traditions

## 📝 Conclusion

Understanding and applying love languages in Islamic marriage can significantly improve the quality of your relationship. By combining this psychological insight with Islamic principles, couples can create deeper connections, better communication, and more fulfilling marriages.

Remember: The goal is to love and serve your spouse in the way they best receive love, following the beautiful example of Prophet Muhammad (peace be upon him) in his marriages.',
        author_id, relationship_psychology_id,
        ARRAY['love languages', 'marriage psychology', 'islamic marriage', 'relationship advice'],
        NOW() - INTERVAL '5 days', 9, 178, 16, 11, false, 'published', 'en'
    ),

    -- Health & Wellness Articles
    (
        'Mental Health in Marriage: Islamic Approach to Emotional Wellness',
        'Explore how Islamic teachings support mental health in marriage, including dealing with stress, anxiety, and maintaining emotional balance.',
        '# Mental Health in Marriage: Islamic Approach to Emotional Wellness

## 🧠 Introduction

Mental health is crucial for a successful marriage. Islam provides comprehensive guidance for maintaining emotional wellness and supporting each other through life''s challenges.

## 🕌 Islamic Foundations of Mental Health

### Spiritual Wellness
- Regular prayer and remembrance of Allah
- Trust in Allah''s wisdom (Tawakkul)
- Seeking forgiveness and repentance
- Gratitude and positive thinking
- Reading and reflecting on the Quran

### Community Support
- Maintaining family relationships
- Building friendships with righteous people
- Participating in community activities
- Seeking guidance from knowledgeable people
- Helping others in need

## 💑 Supporting Your Spouse''s Mental Health

### Recognition of Mental Health Issues
- Changes in mood or behavior
- Withdrawal from activities
- Sleep or appetite changes
- Difficulty concentrating
- Persistent sadness or anxiety

### Providing Support
- Listen without judgment
- Offer emotional comfort
- Encourage professional help when needed
- Maintain patience and understanding
- Make dua for their wellbeing

### Creating a Supportive Environment
- Maintain open communication
- Reduce stress at home
- Encourage healthy habits
- Provide space when needed
- Show consistent love and support

## 🌱 Building Emotional Resilience

### Individual Practices
- Regular self-reflection
- Stress management techniques
- Healthy lifestyle choices
- Continuous learning and growth
- Maintaining work-life balance

### Couple Practices
- Regular check-ins with each other
- Shared stress-relief activities
- Supporting each other''s goals
- Creating positive memories together
- Facing challenges as a team

## 🤲 Islamic Coping Strategies

### During Difficult Times
- Increase in prayer and dhikr
- Seek Allah''s guidance through Istikhara
- Practice patience (Sabr)
- Remember that trials are tests
- Focus on what you can control

### Dealing with Anxiety
- Trust in Allah''s plan
- Practice deep breathing with dhikr
- Engage in physical activity
- Maintain social connections
- Seek professional help when needed

### Managing Depression
- Maintain daily prayers
- Spend time in nature
- Connect with supportive people
- Engage in meaningful activities
- Consider therapy or counseling

## 🏥 When to Seek Professional Help

### Warning Signs
- Persistent mental health symptoms
- Thoughts of self-harm
- Inability to function daily
- Substance abuse
- Severe relationship problems

### Islamic Perspective on Therapy
- Seeking help is encouraged in Islam
- Mental health is part of overall health
- Professional help complements spiritual practices
- Choose culturally sensitive therapists
- Combine therapy with Islamic practices

## 👨‍👩‍👧‍👦 Impact on Family Life

### Children''s Wellbeing
- Model healthy emotional expression
- Create a stable home environment
- Teach coping skills
- Maintain family routines
- Seek help for children when needed

### Extended Family Relationships
- Communicate boundaries clearly
- Manage family expectations
- Seek support from understanding relatives
- Protect your nuclear family''s wellbeing
- Balance individual and family needs

## 🌟 Preventive Mental Health Practices

### Daily Habits
- Morning and evening adhkar
- Regular exercise
- Healthy eating
- Adequate sleep
- Mindfulness and meditation

### Weekly Practices
- Family time and activities
- Social connections
- Learning new things
- Helping others
- Enjoying nature

### Monthly Practices
- Relationship check-ins
- Goal setting and review
- Self-care activities
- Community involvement
- Spiritual retreats

## 💪 Building a Mentally Healthy Marriage

### Communication Strategies
- Express feelings openly
- Listen with empathy
- Avoid criticism and blame
- Focus on solutions
- Seek to understand first

### Conflict Resolution
- Address issues early
- Stay calm during discussions
- Focus on the problem, not the person
- Seek compromise
- Forgive and move forward

### Intimacy and Connection
- Emotional intimacy
- Physical affection
- Shared experiences
- Spiritual connection
- Quality time together

## 📝 Conclusion

Mental health is an essential component of a successful Islamic marriage. By combining Islamic teachings with modern understanding of mental wellness, couples can build strong, resilient relationships that weather life''s storms.

Remember: Taking care of your mental health is not just beneficial for you, but it''s also a way of taking care of your spouse and family. Seek help when needed, and remember that Allah is always there to support you.',
        author_id, health_wellness_id,
        ARRAY['mental health', 'islamic wellness', 'marriage support', 'emotional health'],
        NOW() - INTERVAL '6 days', 11, 167, 14, 9, true, 'published', 'en'
    );

END $$;
