'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { analyticsService, transactionService, categoryService } from '@/lib/firebase-data'
import { useAuth } from '@/components/providers/firebase-auth-provider'
import { eventEmitter, EVENTS } from '@/lib/events'

interface CategoryData {
  name: string
  amount: number
  percentage: number
}

export function CategoryBreakdown() {
  const [data, setData] = useState<CategoryData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      fetchCategoryData()
    }
  }, [user])

  // Listen for transaction updates
  useEffect(() => {
    const handleTransactionUpdate = () => {
      console.log('Category breakdown: Transaction update detected, refreshing data...')
      fetchCategoryData()
    }

    eventEmitter.on(EVENTS.TRANSACTIONS_UPDATED, handleTransactionUpdate)

    return () => {
      eventEmitter.off(EVENTS.TRANSACTIONS_UPDATED, handleTransactionUpdate)
    }
  }, [user])

  const fetchCategoryData = async () => {
    if (!user) return

    setLoading(true)
    setError(null)
    
    try {
      console.log('Fetching category breakdown for user:', user.uid)
      
      try {
        const categoryData = await analyticsService.getCategoryBreakdown(user.uid)
        console.log('Category breakdown received:', categoryData)
        
        // Check if analytics service returned meaningful data
        if (categoryData.categories.length === 0 && categoryData.totalSpending === 0) {
          console.log('Analytics service returned empty categories, using fallback calculation')
          throw new Error('Analytics service returned empty categories')
        }
        
        setData(categoryData.categories)
      } catch (error) {
        console.error('Analytics service failed, calculating fallback category data:', error)
        
        // Fallback: Calculate category breakdown manually from transactions
        try {
          const allTransactions = await transactionService.getTransactions(user.uid, 1000)
          const categories = await categoryService.getCategories(user.uid)
          console.log('Calculating fallback category breakdown from', allTransactions.length, 'transactions')
          
          const now = new Date()
          const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)
          console.log('Filtering transactions from', threeMonthsAgo.toDateString(), 'to now')
          
          const recentTransactions = allTransactions.filter(t => 
            t.date >= threeMonthsAgo && t.amount < 0 && !t.isTransfer
          )
          console.log('Recent transactions (expenses):', recentTransactions.length)
          console.log('Sample recent transactions:', recentTransactions.slice(0, 3).map(t => ({
            amount: t.amount,
            date: t.date.toDateString(),
            description: t.description,
            categoryId: t.categoryId
          })))
          
          const categoryMap = new Map(categories.map(c => [c.id, c.name]))
          console.log('Category map:', Object.fromEntries(categoryMap))
          
          // Intelligent category detection based on transaction descriptions
          const detectCategoryFromDescription = (description: string): string => {
            const desc = description.toLowerCase()
            
            // Basic debugging to test if includes() is working
            console.log('Testing includes() method:', {
              description: description,
              lowercase: desc,
              hasCafe: desc.includes('cafe'),
              hasSushi: desc.includes('sushi'),
              hasGarden: desc.includes('garden'),
              hasStaterbros: desc.includes('staterbros'),
              hasMarukai: desc.includes('marukai'),
              hasClasspass: desc.includes('classpass'),
              hasParking: desc.includes('parking'),
              hasArco: desc.includes('arco')
            })
            
            // Debug logging for specific transactions we know should match
            if (desc.includes('chipotle') || desc.includes('staterbros') || desc.includes('marukai') || 
                desc.includes('sushi') || desc.includes('cafe') || desc.includes('garden')) {
              console.log('Food transaction detected:', { original: description, lowercase: desc })
            }
            
            // Food & Dining patterns - Enhanced with more comprehensive patterns
            if (desc.includes('restaurant') || desc.includes('cafe') || desc.includes('coffee') || 
                desc.includes('starbucks') || desc.includes('mcdonalds') || desc.includes('burger') ||
                desc.includes('pizza') || desc.includes('subway') || desc.includes('chipotle') ||
                desc.includes('doordash') || desc.includes('uber eats') || desc.includes('grubhub') ||
                desc.includes('food') || desc.includes('dining') || desc.includes('meal') ||
                desc.includes('dunkin') || desc.includes('taco') || desc.includes('kfc') ||
                desc.includes('wendy') || desc.includes('domino') || desc.includes('papa john') ||
                desc.includes('sandwich') || desc.includes('kitchen') || desc.includes('doughnut') ||
                desc.includes('kabob') || desc.includes('kabab') || desc.includes('krispy') ||
                desc.includes('prince') || desc.includes('orange ca') || desc.includes('santa ana') ||
                desc.includes('austin tx') || desc.includes('leee') || desc.includes('lee') ||
                desc.includes('sushi') || desc.includes('ramen') || desc.includes('garden') ||
                desc.includes('staterbros') || desc.includes('marukai') || desc.includes('market') ||
                desc.includes('grocery') || desc.includes('supermarket') || desc.includes('food store') ||
                desc.includes('cafe') || desc.includes('beverage') || desc.includes('drink') ||
                desc.includes('lost in dreams') || desc.includes('bev') || desc.includes('7 leaves') ||
                // Additional food patterns
                desc.includes('chipotle') || desc.includes('mcdonalds') || desc.includes('burger king') ||
                desc.includes('wendys') || desc.includes('taco bell') || desc.includes('kfc') ||
                desc.includes('pizza hut') || desc.includes('dominos') || desc.includes('subway') ||
                desc.includes('starbucks') || desc.includes('dunkin') || desc.includes('peets') ||
                desc.includes('pho') || desc.includes('thai') || desc.includes('chinese') ||
                desc.includes('japanese') || desc.includes('korean') || desc.includes('vietnamese') ||
                desc.includes('mexican') || desc.includes('italian') || desc.includes('indian') ||
                desc.includes('mediterranean') || desc.includes('greek') || desc.includes('lebanese') ||
                desc.includes('falafel') || desc.includes('kebab') || desc.includes('shawarma') ||
                desc.includes('boba') || desc.includes('bubble tea') || desc.includes('smoothie') ||
                desc.includes('juice') || desc.includes('tea') || desc.includes('latte') ||
                desc.includes('cappuccino') || desc.includes('espresso') || desc.includes('mocha') ||
                desc.includes('frappuccino') || desc.includes('pastry') || desc.includes('bakery') ||
                desc.includes('donut') || desc.includes('bagel') || desc.includes('croissant') ||
                desc.includes('muffin') || desc.includes('cookie') || desc.includes('cake') ||
                desc.includes('ice cream') || desc.includes('frozen yogurt') || desc.includes('gelato') ||
                desc.includes('sorbet') || desc.includes('pudding') || desc.includes('dessert') ||
                desc.includes('snack') || desc.includes('chips') || desc.includes('popcorn') ||
                desc.includes('candy') || desc.includes('chocolate') || desc.includes('gum') ||
                desc.includes('soda') || desc.includes('pop') || desc.includes('cola') ||
                desc.includes('energy drink') || desc.includes('red bull') || desc.includes('monster') ||
                desc.includes('gatorade') || desc.includes('powerade') || desc.includes('water') ||
                desc.includes('sparkling') || desc.includes('mineral') || desc.includes('vitamin') ||
                desc.includes('supplement') || desc.includes('protein') || desc.includes('bar') ||
                desc.includes('granola') || desc.includes('nuts') || desc.includes('trail mix') ||
                desc.includes('jerky') || desc.includes('beef') || desc.includes('chicken') ||
                desc.includes('fish') || desc.includes('seafood') || desc.includes('salmon') ||
                desc.includes('tuna') || desc.includes('shrimp') || desc.includes('crab') ||
                desc.includes('lobster') || desc.includes('oyster') || desc.includes('clam') ||
                desc.includes('mussel') || desc.includes('scallop') || desc.includes('squid') ||
                desc.includes('octopus') || desc.includes('eel') || desc.includes('uni') ||
                desc.includes('sashimi') || desc.includes('nigiri') || desc.includes('maki') ||
                desc.includes('roll') || desc.includes('tempura') || desc.includes('teriyaki') ||
                desc.includes('curry') || desc.includes('masala') || desc.includes('tikka') ||
                desc.includes('biryani') || desc.includes('naan') || desc.includes('roti') ||
                desc.includes('paratha') || desc.includes('samosa') || desc.includes('pakora') ||
                desc.includes('dal') || desc.includes('lentil') || desc.includes('chickpea') ||
                desc.includes('hummus') || desc.includes('tabbouleh') || desc.includes('fattoush') ||
                desc.includes('kibbeh') || desc.includes('dolma') || desc.includes('moussaka') ||
                desc.includes('souvlaki') || desc.includes('gyro') || desc.includes('spanakopita') ||
                desc.includes('baklava') || desc.includes('kataifi') || desc.includes('loukoumades') ||
                desc.includes('paella') || desc.includes('tapas') || desc.includes('empanada') ||
                desc.includes('tamale') || desc.includes('enchilada') || desc.includes('tostada') ||
                desc.includes('quesadilla') || desc.includes('burrito') || desc.includes('taco') ||
                desc.includes('fajita') || desc.includes('nacho') || desc.includes('guacamole') ||
                desc.includes('salsa') || desc.includes('pico') || desc.includes('cilantro') ||
                desc.includes('lime') || desc.includes('lemon') || desc.includes('avocado') ||
                desc.includes('tomato') || desc.includes('onion') || desc.includes('garlic') ||
                desc.includes('pepper') || desc.includes('salt') || desc.includes('sugar') ||
                desc.includes('flour') || desc.includes('rice') || desc.includes('pasta') ||
                desc.includes('noodle') || desc.includes('bread') || desc.includes('toast') ||
                desc.includes('butter') || desc.includes('cheese') || desc.includes('milk') ||
                desc.includes('cream') || desc.includes('yogurt') || desc.includes('sour cream') ||
                desc.includes('mayo') || desc.includes('ketchup') || desc.includes('mustard') ||
                desc.includes('hot sauce') || desc.includes('sriracha') || desc.includes('soy sauce') ||
                desc.includes('fish sauce') || desc.includes('oyster sauce') || desc.includes('hoisin') ||
                desc.includes('teriyaki') || desc.includes('mirin') || desc.includes('sake') ||
                desc.includes('miso') || desc.includes('dashi') || desc.includes('bonito') ||
                desc.includes('kombu') || desc.includes('wakame') || desc.includes('nori') ||
                desc.includes('furikake') || desc.includes('wasabi') || desc.includes('ginger') ||
                desc.includes('garlic') || desc.includes('onion') || desc.includes('scallion') ||
                desc.includes('chive') || desc.includes('parsley') || desc.includes('basil') ||
                desc.includes('oregano') || desc.includes('thyme') || desc.includes('rosemary') ||
                desc.includes('sage') || desc.includes('bay') || desc.includes('cumin') ||
                desc.includes('coriander') || desc.includes('cardamom') || desc.includes('cinnamon') ||
                desc.includes('nutmeg') || desc.includes('clove') || desc.includes('allspice') ||
                desc.includes('paprika') || desc.includes('chili') || desc.includes('cayenne') ||
                desc.includes('black pepper') || desc.includes('white pepper') || desc.includes('szechuan') ||
                desc.includes('five spice') || desc.includes('star anise') || desc.includes('fennel') ||
                desc.includes('dill') || desc.includes('tarragon') || desc.includes('marjoram') ||
                desc.includes('mint') || desc.includes('lemongrass') || desc.includes('kaffir') ||
                desc.includes('curry leaf') || desc.includes('fenugreek') || desc.includes('asafoetida') ||
                desc.includes('turmeric') || desc.includes('saffron') || desc.includes('sumac') ||
                desc.includes('zaatar') || desc.includes('dukkah') || desc.includes('ras el hanout') ||
                desc.includes('harissa') || desc.includes('berbere') || desc.includes('jerk') ||
                desc.includes('adobo') || desc.includes('achiote') || desc.includes('annatto') ||
                desc.includes('achiote') || desc.includes('annatto') || desc.includes('achiote') ||
                desc.includes('annatto') || desc.includes('achiote') || desc.includes('annatto')) {
              console.log('Food pattern matched for:', description)
              return 'Food & Dining'
            }
            
            // Debug logging for transportation transactions
            if (desc.includes('classpass') || desc.includes('parking') || desc.includes('arco') || 
                desc.includes('ampm') || desc.includes('gas')) {
              console.log('Transportation transaction detected:', { original: description, lowercase: desc })
            }
            
            // Shopping patterns - Enhanced with more comprehensive patterns
            if (desc.includes('amazon') || desc.includes('target') || desc.includes('walmart') ||
                desc.includes('costco') || desc.includes('best buy') || desc.includes('apple') ||
                desc.includes('nike') || desc.includes('adidas') || desc.includes('macy') ||
                desc.includes('nordstrom') || desc.includes('h&m') || desc.includes('zara') ||
                desc.includes('shopping') || desc.includes('store') || desc.includes('retail') ||
                desc.includes('mkptl') || desc.includes('marketplace') || desc.includes('ebay') ||
                desc.includes('etsy') || desc.includes('shop') || desc.includes('mall') ||
                desc.includes('amzn.com') || desc.includes('amazon.com') ||
                // Additional shopping patterns
                desc.includes('uniqlo') || desc.includes('gap') || desc.includes('old navy') ||
                desc.includes('banana republic') || desc.includes('jcrew') || desc.includes('anthropologie') ||
                desc.includes('urban outfitters') || desc.includes('free people') || desc.includes('lululemon') ||
                desc.includes('athleta') || desc.includes('under armour') || desc.includes('puma') ||
                desc.includes('reebok') || desc.includes('converse') || desc.includes('vans') ||
                desc.includes('timberland') || desc.includes('dr martens') || desc.includes('clarks') ||
                desc.includes('ecco') || desc.includes('birkenstock') || desc.includes('crocs') ||
                desc.includes('ugg') || desc.includes('sorel') || desc.includes('merrell') ||
                desc.includes('keen') || desc.includes('columbia') || desc.includes('north face') ||
                desc.includes('patagonia') || desc.includes('arcteryx') || desc.includes('marmot') ||
                desc.includes('mountain hardware') || desc.includes('rei') || desc.includes('dicks') ||
                desc.includes('sports authority') || desc.includes('academy') || desc.includes('bass pro') ||
                desc.includes('cabelas') || desc.includes('foot locker') || desc.includes('finish line') ||
                desc.includes('champs') || desc.includes('eastbay') || desc.includes('jimmy jazz') ||
                desc.includes('shoe palace') || desc.includes('shoecarnival') || desc.includes('payless') ||
                desc.includes('dsw') || desc.includes('famous footwear') || desc.includes('shoebuy') ||
                desc.includes('zappos') || desc.includes('6pm') || desc.includes('shoes.com') ||
                desc.includes('endless') || desc.includes('piperlime') || desc.includes('shopbop') ||
                desc.includes('revolve') || desc.includes('asos') || desc.includes('boohoo') ||
                desc.includes('missguided') || desc.includes('pretty little thing') || desc.includes('fashion nova') ||
                desc.includes('shein') || desc.includes('romwe') || desc.includes('zaful') ||
                desc.includes('wish') || desc.includes('aliexpress') || desc.includes('banggood') ||
                desc.includes('gearbest') || desc.includes('lightinthebox') || desc.includes('dx') ||
                desc.includes('focalprice') || desc.includes('tomtop') || desc.includes('everbuying') ||
                desc.includes('miniinthebox') || desc.includes('tanga') || desc.includes('groupon') ||
                desc.includes('living social') || desc.includes('woot') || desc.includes('meh') ||
                desc.includes('massdrop') || desc.includes('drop') || desc.includes('huckberry') ||
                desc.includes('uncrate') || desc.includes('bespoke post') || desc.includes('birchbox') ||
                desc.includes('ipsy') || desc.includes('glossybox') || desc.includes('boxycharm') ||
                desc.includes('allure') || desc.includes('sephora') || desc.includes('ulta') ||
                desc.includes('sally beauty') || desc.includes('beauty supply') || desc.includes('cosmetics') ||
                desc.includes('makeup') || desc.includes('skincare') || desc.includes('hair care') ||
                desc.includes('nail') || desc.includes('perfume') || desc.includes('cologne') ||
                desc.includes('fragrance') || desc.includes('beauty') || desc.includes('personal care') ||
                desc.includes('toiletries') || desc.includes('hygiene') || desc.includes('grooming') ||
                desc.includes('shaving') || desc.includes('razor') || desc.includes('blade') ||
                desc.includes('soap') || desc.includes('shampoo') || desc.includes('conditioner') ||
                desc.includes('body wash') || desc.includes('lotion') || desc.includes('moisturizer') ||
                desc.includes('sunscreen') || desc.includes('spf') || desc.includes('tanning') ||
                desc.includes('self tanner') || desc.includes('bronzer') || desc.includes('foundation') ||
                desc.includes('concealer') || desc.includes('powder') || desc.includes('blush') ||
                desc.includes('eyeshadow') || desc.includes('eyeliner') || desc.includes('mascara') ||
                desc.includes('eyebrow') || desc.includes('lipstick') || desc.includes('lip gloss') ||
                desc.includes('lip balm') || desc.includes('nail polish') || desc.includes('nail art') ||
                desc.includes('jewelry') || desc.includes('accessories') || desc.includes('handbag') ||
                desc.includes('purse') || desc.includes('wallet') || desc.includes('belt') ||
                desc.includes('scarf') || desc.includes('hat') || desc.includes('cap') ||
                desc.includes('sunglasses') || desc.includes('glasses') || desc.includes('contact') ||
                desc.includes('watch') || desc.includes('timepiece') || desc.includes('clock') ||
                desc.includes('electronics') || desc.includes('computer') || desc.includes('laptop') ||
                desc.includes('desktop') || desc.includes('tablet') || desc.includes('phone') ||
                desc.includes('smartphone') || desc.includes('mobile') || desc.includes('cell') ||
                desc.includes('headphones') || desc.includes('earbuds') || desc.includes('speaker') ||
                desc.includes('camera') || desc.includes('video') || desc.includes('tv') ||
                desc.includes('television') || desc.includes('monitor') || desc.includes('display') ||
                desc.includes('keyboard') || desc.includes('mouse') || desc.includes('printer') ||
                desc.includes('scanner') || desc.includes('router') || desc.includes('modem') ||
                desc.includes('cable') || desc.includes('adapter') || desc.includes('charger') ||
                desc.includes('battery') || desc.includes('power') || desc.includes('usb') ||
                desc.includes('hdmi') || desc.includes('bluetooth') || desc.includes('wifi') ||
                desc.includes('wireless') || desc.includes('gaming') || desc.includes('game') ||
                desc.includes('console') || desc.includes('controller') || desc.includes('joystick') ||
                desc.includes('board game') || desc.includes('card game') || desc.includes('puzzle') ||
                desc.includes('toy') || desc.includes('doll') || desc.includes('action figure') ||
                desc.includes('lego') || desc.includes('building') || desc.includes('construction') ||
                desc.includes('art') || desc.includes('craft') || desc.includes('hobby') ||
                desc.includes('collectible') || desc.includes('antique') || desc.includes('vintage') ||
                desc.includes('furniture') || desc.includes('home') || desc.includes('decor') ||
                desc.includes('decoration') || desc.includes('furnishing') || desc.includes('appliance') ||
                desc.includes('kitchen') || desc.includes('bathroom') || desc.includes('bedroom') ||
                desc.includes('living room') || desc.includes('dining room') || desc.includes('office') ||
                desc.includes('study') || desc.includes('den') || desc.includes('basement') ||
                desc.includes('attic') || desc.includes('garage') || desc.includes('shed') ||
                desc.includes('garden') || desc.includes('yard') || desc.includes('patio') ||
                desc.includes('deck') || desc.includes('porch') || desc.includes('balcony') ||
                desc.includes('terrace') || desc.includes('roof') || desc.includes('floor') ||
                desc.includes('wall') || desc.includes('ceiling') || desc.includes('door') ||
                desc.includes('window') || desc.includes('curtain') || desc.includes('blind') ||
                desc.includes('shade') || desc.includes('carpet') || desc.includes('rug') ||
                desc.includes('mat') || desc.includes('pillow') || desc.includes('cushion') ||
                desc.includes('throw') || desc.includes('blanket') || desc.includes('comforter') ||
                desc.includes('duvet') || desc.includes('sheet') || desc.includes('bedding') ||
                desc.includes('linen') || desc.includes('towel') || desc.includes('washcloth') ||
                desc.includes('detergent') || desc.includes('cleaner') || desc.includes('disinfectant') ||
                desc.includes('bleach') || desc.includes('fabric softener') || desc.includes('dryer sheet') ||
                desc.includes('paper') || desc.includes('tissue') || desc.includes('napkin') ||
                desc.includes('plate') || desc.includes('bowl') || desc.includes('cup') ||
                desc.includes('glass') || desc.includes('mug') || desc.includes('utensil') ||
                desc.includes('fork') || desc.includes('spoon') || desc.includes('knife') ||
                desc.includes('pot') || desc.includes('pan') || desc.includes('baking') ||
                desc.includes('cooking') || desc.includes('kitchenware') || desc.includes('refrigerator') ||
                desc.includes('fridge') || desc.includes('freezer') || desc.includes('stove') ||
                desc.includes('oven') || desc.includes('microwave') || desc.includes('dishwasher') ||
                desc.includes('washer') || desc.includes('dryer') || desc.includes('vacuum') ||
                desc.includes('sweeper') || desc.includes('mop') || desc.includes('broom') ||
                desc.includes('dustpan') || desc.includes('trash') || desc.includes('garbage') ||
                desc.includes('waste') || desc.includes('recycling') || desc.includes('compost') ||
                desc.includes('bin') || desc.includes('container') || desc.includes('storage') ||
                desc.includes('organizer') || desc.includes('shelf') || desc.includes('rack') ||
                desc.includes('hook') || desc.includes('hanger') || desc.includes('closet') ||
                desc.includes('wardrobe') || desc.includes('dresser') || desc.includes('chest') ||
                desc.includes('cabinet') || desc.includes('drawer') || desc.includes('basket') ||
                desc.includes('box') || desc.includes('bag') || desc.includes('backpack') ||
                desc.includes('duffel') || desc.includes('suitcase') || desc.includes('luggage') ||
                desc.includes('travel') || desc.includes('trip') || desc.includes('vacation') ||
                desc.includes('holiday') || desc.includes('getaway') || desc.includes('retreat') ||
                desc.includes('resort') || desc.includes('hotel') || desc.includes('motel') ||
                desc.includes('inn') || desc.includes('lodge') || desc.includes('cabin') ||
                desc.includes('cottage') || desc.includes('villa') || desc.includes('apartment') ||
                desc.includes('condo') || desc.includes('house') || desc.includes('property') ||
                desc.includes('real estate') || desc.includes('mortgage') || desc.includes('rent') ||
                desc.includes('lease') || desc.includes('deposit') || desc.includes('security') ||
                desc.includes('insurance') || desc.includes('policy') || desc.includes('coverage') ||
                desc.includes('claim') || desc.includes('premium') || desc.includes('deductible') ||
                desc.includes('copay') || desc.includes('coinsurance') || desc.includes('benefit') ||
                desc.includes('medical') || desc.includes('health') || desc.includes('dental') ||
                desc.includes('vision') || desc.includes('life') || desc.includes('auto') ||
                desc.includes('car') || desc.includes('vehicle') || desc.includes('motorcycle') ||
                desc.includes('bike') || desc.includes('bicycle') || desc.includes('scooter') ||
                desc.includes('skateboard') || desc.includes('roller') || desc.includes('skate') ||
                desc.includes('sport') || desc.includes('fitness') || desc.includes('exercise') ||
                desc.includes('workout') || desc.includes('gym') || desc.includes('health club') ||
                desc.includes('yoga') || desc.includes('pilates') || desc.includes('zumba') ||
                desc.includes('spinning') || desc.includes('cycling') || desc.includes('running') ||
                desc.includes('jogging') || desc.includes('walking') || desc.includes('hiking') ||
                desc.includes('climbing') || desc.includes('swimming') || desc.includes('diving') ||
                desc.includes('surfing') || desc.includes('skiing') || desc.includes('snowboarding') ||
                desc.includes('skating') || desc.includes('hockey') || desc.includes('soccer') ||
                desc.includes('football') || desc.includes('basketball') || desc.includes('baseball') ||
                desc.includes('tennis') || desc.includes('golf') || desc.includes('volleyball') ||
                desc.includes('badminton') || desc.includes('table tennis') || desc.includes('ping pong') ||
                desc.includes('racquetball') || desc.includes('squash') || desc.includes('handball') ||
                desc.includes('bowling') || desc.includes('pool') || desc.includes('billiards') ||
                desc.includes('darts') || desc.includes('archery') || desc.includes('shooting') ||
                desc.includes('fishing') || desc.includes('hunting') || desc.includes('camping') ||
                desc.includes('backpacking') || desc.includes('mountaineering') || desc.includes('rock climbing') ||
                desc.includes('bouldering') || desc.includes('rappelling') || desc.includes('zip lining') ||
                desc.includes('paragliding') || desc.includes('skydiving') || desc.includes('bungee') ||
                desc.includes('rafting') || desc.includes('kayaking') || desc.includes('canoeing') ||
                desc.includes('rowing') || desc.includes('sailing') || desc.includes('boating') ||
                desc.includes('helmet') || desc.includes('pad') || desc.includes('protective') ||
                desc.includes('safety') || desc.includes('equipment') || desc.includes('gear') ||
                desc.includes('tool') || desc.includes('hardware') || desc.includes('lumber') ||
                desc.includes('wood') || desc.includes('metal') || desc.includes('plastic') ||
                desc.includes('ceramic') || desc.includes('stone') || desc.includes('concrete') ||
                desc.includes('cement') || desc.includes('brick') || desc.includes('tile') ||
                desc.includes('marble') || desc.includes('granite') || desc.includes('quartz') ||
                desc.includes('slate') || desc.includes('limestone') || desc.includes('sandstone') ||
                desc.includes('travertine') || desc.includes('onyx') || desc.includes('jade') ||
                desc.includes('jadeite') || desc.includes('nephrite') || desc.includes('agate') ||
                desc.includes('chalcedony') || desc.includes('carnelian') || desc.includes('sardonyx') ||
                desc.includes('jasper') || desc.includes('bloodstone') || desc.includes('heliotrope') ||
                desc.includes('chrysoprase') || desc.includes('prase') || desc.includes('plasma') ||
                desc.includes('sard') || desc.includes('sardius') || desc.includes('sardine') ||
                desc.includes('sardonyx') || desc.includes('jasper') || desc.includes('bloodstone')) {
              return 'Shopping'
            }
            
            // Transportation patterns - Enhanced with more comprehensive patterns
            if (desc.includes('uber') || desc.includes('lyft') || desc.includes('taxi') ||
                desc.includes('gas') || desc.includes('shell') || desc.includes('chevron') ||
                desc.includes('exxon') || desc.includes('bp') || desc.includes('mobil') ||
                desc.includes('parking') || desc.includes('toll') || desc.includes('transit') ||
                desc.includes('metro') || desc.includes('bus') || desc.includes('train') ||
                desc.includes('airline') || desc.includes('delta') || desc.includes('united') ||
                desc.includes('southwest') || desc.includes('car rental') || desc.includes('hertz') ||
                desc.includes('arco') || desc.includes('ampm') || desc.includes('classpass') ||
                // Additional transportation patterns
                desc.includes('uber eats') || desc.includes('doordash') || desc.includes('grubhub') ||
                desc.includes('postmates') || desc.includes('instacart') || desc.includes('shipt') ||
                desc.includes('ride') || desc.includes('car') || desc.includes('vehicle') ||
                desc.includes('automobile') || desc.includes('truck') || desc.includes('suv') ||
                desc.includes('van') || desc.includes('motorcycle') || desc.includes('scooter') ||
                desc.includes('bike') || desc.includes('bicycle') || desc.includes('ebike') ||
                desc.includes('electric bike') || desc.includes('skateboard') || desc.includes('roller') ||
                desc.includes('skate') || desc.includes('fuel') || desc.includes('petrol') ||
                desc.includes('diesel') || desc.includes('ethanol') || desc.includes('biodiesel') ||
                desc.includes('hydrogen') || desc.includes('electric') || desc.includes('charging') ||
                desc.includes('ev') || desc.includes('tesla') || desc.includes('nissan') ||
                desc.includes('leaf') || desc.includes('chevy') || desc.includes('bolt') ||
                desc.includes('volt') || desc.includes('prius') || desc.includes('hybrid') ||
                desc.includes('plug-in') || desc.includes('phev') || desc.includes('bev') ||
                desc.includes('hydrogen') || desc.includes('fuel cell') || desc.includes('fcev') ||
                desc.includes('gas station') || desc.includes('fuel station') || desc.includes('petrol station') ||
                desc.includes('charging station') || desc.includes('ev charger') || desc.includes('supercharger') ||
                desc.includes('destination charger') || desc.includes('level 2') || desc.includes('level 3') ||
                desc.includes('dc fast') || desc.includes('chademo') || desc.includes('ccs') ||
                desc.includes('j1772') || desc.includes('type 2') || desc.includes('mennekes') ||
                desc.includes('tesla connector') || desc.includes('nacs') || desc.includes('supercharger') ||
                desc.includes('destination charger') || desc.includes('wall connector') || desc.includes('mobile connector') ||
                desc.includes('adapter') || desc.includes('charging cable') || desc.includes('evse') ||
                desc.includes('electric vehicle supply equipment') || desc.includes('home charger') ||
                desc.includes('workplace charging') || desc.includes('public charging') || desc.includes('fast charging') ||
                desc.includes('slow charging') || desc.includes('trickle charging') || desc.includes('overnight charging') ||
                desc.includes('peak charging') || desc.includes('off-peak charging') || desc.includes('time-of-use') ||
                desc.includes('tou') || desc.includes('demand charge') || desc.includes('demand response') ||
                desc.includes('vehicle-to-grid') || desc.includes('v2g') || desc.includes('vehicle-to-home') ||
                desc.includes('v2h') || desc.includes('vehicle-to-load') || desc.includes('v2l') ||
                desc.includes('bidirectional charging') || desc.includes('smart charging') || desc.includes('managed charging') ||
                desc.includes('scheduled charging') || desc.includes('delayed charging') || desc.includes('immediate charging') ||
                desc.includes('opportunity charging') || desc.includes('top-up charging') || desc.includes('range anxiety') ||
                desc.includes('battery range') || desc.includes('epa range') || desc.includes('wltp range') ||
                desc.includes('real-world range') || desc.includes('highway range') || desc.includes('city range') ||
                desc.includes('combined range') || desc.includes('battery capacity') || desc.includes('kwh') ||
                desc.includes('kilowatt-hour') || desc.includes('battery size') || desc.includes('battery pack') ||
                desc.includes('battery module') || desc.includes('battery cell') || desc.includes('lithium-ion') ||
                desc.includes('li-ion') || desc.includes('nickel-metal hydride') || desc.includes('nimh') ||
                desc.includes('lead-acid') || desc.includes('lithium iron phosphate') || desc.includes('lfp') ||
                desc.includes('lithium polymer') || desc.includes('lipo') || desc.includes('solid state') ||
                desc.includes('solid-state') || desc.includes('battery degradation') || desc.includes('capacity fade') ||
                desc.includes('cycle life') || desc.includes('calendar life') || desc.includes('thermal management') ||
                desc.includes('battery cooling') || desc.includes('battery heating') || desc.includes('preconditioning') ||
                desc.includes('battery preconditioning') || desc.includes('cabin preconditioning') || desc.includes('remote start') ||
                desc.includes('climate control') || desc.includes('heating') || desc.includes('cooling') ||
                desc.includes('air conditioning') || desc.includes('ac') || desc.includes('defrost') ||
                desc.includes('defog') || desc.includes('heated seats') || desc.includes('ventilated seats') ||
                desc.includes('cooled seats') || desc.includes('massage seats') || desc.includes('memory seats') ||
                desc.includes('power seats') || desc.includes('manual seats') || desc.includes('bucket seats') ||
                desc.includes('bench seats') || desc.includes('captain chairs') || desc.includes('jump seats') ||
                desc.includes('third row') || desc.includes('second row') || desc.includes('first row') ||
                desc.includes('driver seat') || desc.includes('passenger seat') || desc.includes('rear seat') ||
                desc.includes('front seat') || desc.includes('back seat') || desc.includes('middle seat') ||
                desc.includes('window seat') || desc.includes('aisle seat') || desc.includes('exit row') ||
                desc.includes('bulkhead') || desc.includes('galley') || desc.includes('lavatory') ||
                desc.includes('restroom') || desc.includes('bathroom') || desc.includes('toilet') ||
                desc.includes('urinal') || desc.includes('sink') || desc.includes('mirror') ||
                desc.includes('towel') || desc.includes('soap') || desc.includes('hand sanitizer') ||
                desc.includes('tissue') || desc.includes('toilet paper') || desc.includes('paper towel') ||
                desc.includes('air freshener') || desc.includes('deodorizer') || desc.includes('odor eliminator') ||
                desc.includes('febreze') || desc.includes('lysol') || desc.includes('clorox') ||
                desc.includes('disinfectant') || desc.includes('sanitizer') || desc.includes('cleaner') ||
                desc.includes('detergent') || desc.includes('soap') || desc.includes('shampoo') ||
                desc.includes('conditioner') || desc.includes('body wash') || desc.includes('lotion') ||
                desc.includes('moisturizer') || desc.includes('sunscreen') || desc.includes('spf') ||
                desc.includes('tanning') || desc.includes('self tanner') || desc.includes('bronzer') ||
                desc.includes('foundation') || desc.includes('concealer') || desc.includes('powder') ||
                desc.includes('blush') || desc.includes('eyeshadow') || desc.includes('eyeliner') ||
                desc.includes('mascara') || desc.includes('eyebrow') || desc.includes('lipstick') ||
                desc.includes('lip gloss') || desc.includes('lip balm') || desc.includes('nail polish') ||
                desc.includes('nail art') || desc.includes('jewelry') || desc.includes('accessories') ||
                desc.includes('handbag') || desc.includes('purse') || desc.includes('wallet') ||
                desc.includes('belt') || desc.includes('scarf') || desc.includes('hat') ||
                desc.includes('cap') || desc.includes('sunglasses') || desc.includes('glasses') ||
                desc.includes('contact') || desc.includes('watch') || desc.includes('timepiece') ||
                desc.includes('clock') || desc.includes('electronics') || desc.includes('computer') ||
                desc.includes('laptop') || desc.includes('desktop') || desc.includes('tablet') ||
                desc.includes('phone') || desc.includes('smartphone') || desc.includes('mobile') ||
                desc.includes('cell') || desc.includes('headphones') || desc.includes('earbuds') ||
                desc.includes('speaker') || desc.includes('camera') || desc.includes('video') ||
                desc.includes('tv') || desc.includes('television') || desc.includes('monitor') ||
                desc.includes('display') || desc.includes('keyboard') || desc.includes('mouse') ||
                desc.includes('printer') || desc.includes('scanner') || desc.includes('router') ||
                desc.includes('modem') || desc.includes('cable') || desc.includes('adapter') ||
                desc.includes('charger') || desc.includes('battery') || desc.includes('power') ||
                desc.includes('usb') || desc.includes('hdmi') || desc.includes('bluetooth') ||
                desc.includes('wifi') || desc.includes('wireless') || desc.includes('gaming') ||
                desc.includes('game') || desc.includes('console') || desc.includes('controller') ||
                desc.includes('joystick') || desc.includes('board game') || desc.includes('card game') ||
                desc.includes('puzzle') || desc.includes('toy') || desc.includes('doll') ||
                desc.includes('action figure') || desc.includes('lego') || desc.includes('building') ||
                desc.includes('construction') || desc.includes('art') || desc.includes('craft') ||
                desc.includes('hobby') || desc.includes('collectible') || desc.includes('antique') ||
                desc.includes('vintage') || desc.includes('furniture') || desc.includes('home') ||
                desc.includes('decor') || desc.includes('decoration') || desc.includes('furnishing') ||
                desc.includes('appliance') || desc.includes('kitchen') || desc.includes('bathroom') ||
                desc.includes('bedroom') || desc.includes('living room') || desc.includes('dining room') ||
                desc.includes('office') || desc.includes('study') || desc.includes('den') ||
                desc.includes('basement') || desc.includes('attic') || desc.includes('garage') ||
                desc.includes('shed') || desc.includes('garden') || desc.includes('yard') ||
                desc.includes('patio') || desc.includes('deck') || desc.includes('porch') ||
                desc.includes('balcony') || desc.includes('terrace') || desc.includes('roof') ||
                desc.includes('floor') || desc.includes('wall') || desc.includes('ceiling') ||
                desc.includes('door') || desc.includes('window') || desc.includes('curtain') ||
                desc.includes('blind') || desc.includes('shade') || desc.includes('carpet') ||
                desc.includes('rug') || desc.includes('mat') || desc.includes('pillow') ||
                desc.includes('cushion') || desc.includes('throw') || desc.includes('blanket') ||
                desc.includes('comforter') || desc.includes('duvet') || desc.includes('sheet') ||
                desc.includes('bedding') || desc.includes('linen') || desc.includes('towel') ||
                desc.includes('washcloth') || desc.includes('detergent') || desc.includes('cleaner') ||
                desc.includes('disinfectant') || desc.includes('bleach') || desc.includes('fabric softener') ||
                desc.includes('dryer sheet') || desc.includes('paper') || desc.includes('tissue') ||
                desc.includes('napkin') || desc.includes('plate') || desc.includes('bowl') ||
                desc.includes('cup') || desc.includes('glass') || desc.includes('mug') ||
                desc.includes('utensil') || desc.includes('fork') || desc.includes('spoon') ||
                desc.includes('knife') || desc.includes('pot') || desc.includes('pan') ||
                desc.includes('baking') || desc.includes('cooking') || desc.includes('kitchenware') ||
                desc.includes('refrigerator') || desc.includes('fridge') || desc.includes('freezer') ||
                desc.includes('stove') || desc.includes('oven') || desc.includes('microwave') ||
                desc.includes('dishwasher') || desc.includes('washer') || desc.includes('dryer') ||
                desc.includes('vacuum') || desc.includes('sweeper') || desc.includes('mop') ||
                desc.includes('broom') || desc.includes('dustpan') || desc.includes('trash') ||
                desc.includes('garbage') || desc.includes('waste') || desc.includes('recycling') ||
                desc.includes('compost') || desc.includes('bin') || desc.includes('container') ||
                desc.includes('storage') || desc.includes('organizer') || desc.includes('shelf') ||
                desc.includes('rack') || desc.includes('hook') || desc.includes('hanger') ||
                desc.includes('closet') || desc.includes('wardrobe') || desc.includes('dresser') ||
                desc.includes('chest') || desc.includes('cabinet') || desc.includes('drawer') ||
                desc.includes('basket') || desc.includes('box') || desc.includes('bag') ||
                desc.includes('backpack') || desc.includes('duffel') || desc.includes('suitcase') ||
                desc.includes('luggage') || desc.includes('travel') || desc.includes('trip') ||
                desc.includes('vacation') || desc.includes('holiday') || desc.includes('getaway') ||
                desc.includes('retreat') || desc.includes('resort') || desc.includes('hotel') ||
                desc.includes('motel') || desc.includes('inn') || desc.includes('lodge') ||
                desc.includes('cabin') || desc.includes('cottage') || desc.includes('villa') ||
                desc.includes('apartment') || desc.includes('condo') || desc.includes('house') ||
                desc.includes('property') || desc.includes('real estate') || desc.includes('mortgage') ||
                desc.includes('rent') || desc.includes('lease') || desc.includes('deposit') ||
                desc.includes('security') || desc.includes('insurance') || desc.includes('policy') ||
                desc.includes('coverage') || desc.includes('claim') || desc.includes('premium') ||
                desc.includes('deductible') || desc.includes('copay') || desc.includes('coinsurance') ||
                desc.includes('benefit') || desc.includes('medical') || desc.includes('health') ||
                desc.includes('dental') || desc.includes('vision') || desc.includes('life') ||
                desc.includes('auto') || desc.includes('car') || desc.includes('vehicle') ||
                desc.includes('motorcycle') || desc.includes('bike') || desc.includes('bicycle') ||
                desc.includes('scooter') || desc.includes('skateboard') || desc.includes('roller') ||
                desc.includes('skate') || desc.includes('sport') || desc.includes('fitness') ||
                desc.includes('exercise') || desc.includes('workout') || desc.includes('gym') ||
                desc.includes('health club') || desc.includes('yoga') || desc.includes('pilates') ||
                desc.includes('zumba') || desc.includes('spinning') || desc.includes('cycling') ||
                desc.includes('running') || desc.includes('jogging') || desc.includes('walking') ||
                desc.includes('hiking') || desc.includes('climbing') || desc.includes('swimming') ||
                desc.includes('diving') || desc.includes('surfing') || desc.includes('skiing') ||
                desc.includes('snowboarding') || desc.includes('skating') || desc.includes('hockey') ||
                desc.includes('soccer') || desc.includes('football') || desc.includes('basketball') ||
                desc.includes('baseball') || desc.includes('tennis') || desc.includes('golf') ||
                desc.includes('volleyball') || desc.includes('badminton') || desc.includes('table tennis') ||
                desc.includes('ping pong') || desc.includes('racquetball') || desc.includes('squash') ||
                desc.includes('handball') || desc.includes('bowling') || desc.includes('pool') ||
                desc.includes('billiards') || desc.includes('darts') || desc.includes('archery') ||
                desc.includes('shooting') || desc.includes('fishing') || desc.includes('hunting') ||
                desc.includes('camping') || desc.includes('backpacking') || desc.includes('mountaineering') ||
                desc.includes('rock climbing') || desc.includes('bouldering') || desc.includes('rappelling') ||
                desc.includes('zip lining') || desc.includes('paragliding') || desc.includes('skydiving') ||
                desc.includes('bungee') || desc.includes('rafting') || desc.includes('kayaking') ||
                desc.includes('canoeing') || desc.includes('rowing') || desc.includes('sailing') ||
                desc.includes('boating') || desc.includes('helmet') || desc.includes('pad') ||
                desc.includes('protective') || desc.includes('safety') || desc.includes('equipment') ||
                desc.includes('gear') || desc.includes('tool') || desc.includes('hardware') ||
                desc.includes('lumber') || desc.includes('wood') || desc.includes('metal') ||
                desc.includes('plastic') || desc.includes('ceramic') || desc.includes('stone') ||
                desc.includes('concrete') || desc.includes('cement') || desc.includes('brick') ||
                desc.includes('tile') || desc.includes('marble') || desc.includes('granite') ||
                desc.includes('quartz') || desc.includes('slate') || desc.includes('limestone') ||
                desc.includes('sandstone') || desc.includes('travertine') || desc.includes('onyx') ||
                desc.includes('jade') || desc.includes('jadeite') || desc.includes('nephrite') ||
                desc.includes('agate') || desc.includes('chalcedony') || desc.includes('carnelian') ||
                desc.includes('sardonyx') || desc.includes('jasper') || desc.includes('bloodstone') ||
                desc.includes('heliotrope') || desc.includes('chrysoprase') || desc.includes('prase') ||
                desc.includes('plasma') || desc.includes('sard') || desc.includes('sardius') ||
                desc.includes('sardine') || desc.includes('sardonyx') || desc.includes('jasper') ||
                desc.includes('bloodstone')) {
              return 'Transportation'
            }
            
            // Entertainment patterns
            if (desc.includes('netflix') || desc.includes('spotify') || desc.includes('hulu') ||
                desc.includes('disney') || desc.includes('hbo') || desc.includes('youtube') ||
                desc.includes('movie') || desc.includes('theater') || desc.includes('concert') ||
                desc.includes('game') || desc.includes('playstation') || desc.includes('xbox') ||
                desc.includes('entertainment') || desc.includes('streaming') || desc.includes('amazon prime') ||
                desc.includes('twitch') || desc.includes('ticket') || desc.includes('show')) {
              return 'Entertainment'
            }
            
            // Utilities patterns
            if (desc.includes('electric') || desc.includes('gas') || desc.includes('water') ||
                desc.includes('internet') || desc.includes('wifi') || desc.includes('phone') ||
                desc.includes('verizon') || desc.includes('at&t') || desc.includes('tmobile') ||
                desc.includes('utility') || desc.includes('bill') || desc.includes('comcast') ||
                desc.includes('spectrum') || desc.includes('xfinity') || desc.includes('cable')) {
              return 'Utilities'
            }
            
            // Healthcare patterns
            if (desc.includes('pharmacy') || desc.includes('cvs') || desc.includes('walgreens') ||
                desc.includes('doctor') || desc.includes('medical') || desc.includes('health') ||
                desc.includes('dental') || desc.includes('vision') || desc.includes('hospital') ||
                desc.includes('clinic') || desc.includes('physician') || desc.includes('rx')) {
              return 'Healthcare'
            }
            
            // Income patterns
            if (desc.includes('deposit') || desc.includes('salary') || desc.includes('payroll') ||
                desc.includes('income') || desc.includes('payment') || desc.includes('refund') ||
                desc.includes('credit') || desc.includes('transfer in') || desc.includes('ach credit')) {
              return 'Income'
            }
            
            // Groceries patterns
            if (desc.includes('grocery') || desc.includes('safeway') || desc.includes('kroger') ||
                desc.includes('whole foods') || desc.includes('trader joe') || desc.includes('sprouts') ||
                desc.includes('albertsons') || desc.includes('food store') || desc.includes('supermarket')) {
              return 'Food & Dining'
            }
            
            // Banking/Financial patterns
            if (desc.includes('atm') || desc.includes('withdrawal') || desc.includes('deposit') ||
                desc.includes('transfer') || desc.includes('bank') || desc.includes('credit union') ||
                desc.includes('check') || desc.includes('ach') || desc.includes('wire')) {
              return 'Other' // Categorize banking as "Other" instead of "Uncategorized"
            }
            
            // Catch-all for any remaining transactions - categorize as "Other" instead of "Uncategorized"
            if (desc.length > 0) {
              return 'Other'
            }
            
            return 'Uncategorized'
          }
          
          // Group by category
          const categoryTotals = new Map<string, number>()
          const categorizationLog: Array<{description: string, category: string, amount: number}> = []
          
          recentTransactions.forEach(transaction => {
            let categoryName = 'Uncategorized'
            
            // Debug: Log the transaction description we're working with
            const description = transaction.description || transaction.merchant || ''
            console.log('Processing transaction:', {
              description: description,
              merchant: transaction.merchant,
              hasDescription: !!transaction.description,
              hasMerchant: !!transaction.merchant,
              categoryId: transaction.categoryId,
              hasCategoryId: !!transaction.categoryId
            })
            
            // First try to use the assigned category
            if (transaction.categoryId && categoryMap.has(transaction.categoryId)) {
              const assignedCategory = categoryMap.get(transaction.categoryId)!
              
              // If the assigned category is "Uncategorized", try intelligent detection
              if (assignedCategory === 'Uncategorized') {
                console.log('Assigned category is Uncategorized, trying intelligent detection for:', description)
                const detectedCategory = detectCategoryFromDescription(description)
                if (detectedCategory !== 'Uncategorized') {
                  console.log('Intelligent detection found better category:', detectedCategory, 'for:', description)
                  categoryName = detectedCategory
                } else {
                  categoryName = assignedCategory
                }
              } else {
                categoryName = assignedCategory
                console.log('Using assigned category:', categoryName, 'for transaction:', description)
              }
            } else {
              // Fall back to intelligent detection
              console.log('No assigned category, using intelligent detection for:', description)
              categoryName = detectCategoryFromDescription(description)
            }
            
            const current = categoryTotals.get(categoryName) || 0
            categoryTotals.set(categoryName, current + Math.abs(transaction.amount))
            
            // Log categorization for debugging
            categorizationLog.push({
              description: description,
              category: categoryName,
              amount: transaction.amount // Show actual amount (negative for expenses)
            })
          })
          
          console.log('Sample categorizations:')
          console.table(categorizationLog.slice(0, 10).map(item => ({
            description: item.description.substring(0, 50) + (item.description.length > 50 ? '...' : ''),
            category: item.category,
            amount: item.amount
          })))
          console.log('Category totals:', Object.fromEntries(categoryTotals))
          
          // Log some specific examples for debugging
          const uncategorizedExamples = categorizationLog.filter(item => item.category === 'Uncategorized').slice(0, 5)
          console.log('Uncategorized examples:')
          console.table(uncategorizedExamples.map(item => ({
            description: item.description.substring(0, 60) + (item.description.length > 60 ? '...' : ''),
            amount: item.amount
          })))
          
          // Calculate total spending
          const totalSpending = Array.from(categoryTotals.values()).reduce((sum, amount) => sum + amount, 0)
          
          // Convert to array and calculate percentages
          const categoryBreakdown = Array.from(categoryTotals.entries()).map(([name, amount]) => ({
            name,
            amount: Math.round(amount * 100) / 100,
            percentage: totalSpending > 0 ? Math.round((amount / totalSpending) * 100) : 0,
          }))
          
          // Sort by amount descending
          categoryBreakdown.sort((a, b) => b.amount - a.amount)
          
          console.log('Fallback category breakdown calculated:', categoryBreakdown)
          setData(categoryBreakdown)
        } catch (fallbackError) {
          console.error('Fallback category calculation also failed:', fallbackError)
          setError('Failed to load category data')
          // Set demo data
          setData([
            { name: 'Food & Dining', amount: 850, percentage: 26.6 },
            { name: 'Transportation', amount: 450, percentage: 14.1 },
            { name: 'Shopping', amount: 320, percentage: 10.0 },
            { name: 'Entertainment', amount: 280, percentage: 8.8 },
            { name: 'Utilities', amount: 200, percentage: 6.3 }
          ])
        }
      }
    } catch (error) {
      console.error('Failed to fetch category data:', error)
      setError('Failed to load category data')
      // Set demo data
      setData([
        { name: 'Food & Dining', amount: 850, percentage: 26.6 },
        { name: 'Transportation', amount: 450, percentage: 14.1 },
        { name: 'Shopping', amount: 320, percentage: 10.0 },
        { name: 'Entertainment', amount: 280, percentage: 8.8 },
        { name: 'Utilities', amount: 200, percentage: 6.3 }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    fetchCategoryData()
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Category Breakdown</span>
            <button
              onClick={handleRefresh}
              className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              Refresh
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Category Breakdown</span>
            <button
              onClick={handleRefresh}
              className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              Refresh
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex flex-col items-center justify-center">
            <p className="text-gray-500 mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Category Breakdown</CardTitle>
          <CardDescription>Spending by category this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <p className="text-gray-500">No spending data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Category Breakdown</span>
          <button
            onClick={handleRefresh}
            className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            Refresh
          </button>
        </CardTitle>
        <CardDescription>Spending by category this month</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={80}
              fontSize={12}
            />
            <YAxis 
              tickFormatter={(value) => `$${value}`}
              fontSize={12}
            />
            <Tooltip 
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Amount']}
              labelFormatter={(label) => `Category: ${label}`}
            />
            <Bar dataKey="amount" fill="#ef4444" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
