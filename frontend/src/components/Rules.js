import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Typography, Box, Container, Dialog, DialogTitle, DialogContent, DialogActions, IconButton } from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';

const Rules = () => {
  const navigate = useNavigate();
  const hindiRef = useRef(null);
  const englishRef = useRef(null);
  const [open, setOpen] = useState(true);

  const handleMainMenu = () => {
    navigate("/home");
  };

  const scrollToHindi = () => {
    hindiRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToEnglish = () => {
    englishRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="center" mb={2}>
        <Button className="main-menu-btn" variant="contained" onClick={handleMainMenu}>
          MAIN MENU
        </Button>
      </Box>
      <Box display="flex" justifyContent="center" mb={4}>
        <Button className="rule_border_btn" variant="outlined" onClick={scrollToHindi} sx={{ mr: 2 }}>
          Hindi
        </Button>
        <Button className="rule_border_btn" variant="outlined" onClick={scrollToEnglish}>
          English
        </Button>
      </Box>
      <Typography variant="body1" align="center" mb={4}>
        कृपया नियमों को समझने के लिए यहां कुछ मिनट दें, और अपने अनुसार समझ लें |
      </Typography>

      <div ref={hindiRef}>
        <Typography variant="h6">NOTE-</Typography>
        <Typography variant="body2">
          * 1. सभी डीलर्स से निवेदन है कि क्लाइंट्स को साइट के रूल्स समझाने के
          बाद ही सौदे करवायें।
        </Typography>
        <Typography variant="body2">
          * 2. अगर आप इस एग्रीमेंट को ऐक्सेप्ट नहीं करते हे तो कोई सौदा नहीं
          कीजिये।
        </Typography>
        <Typography variant="body2">
          * 3 सर्वर या वेबसाइट में किसी तरह की खराबी आने या बंद हो जाने पर केवल
          किए गए सौदे ही मान्य होंगे | ऐसी स्तिथि में किसी तरह का वाद-विवाद
          मान्य नहीं होगा
        </Typography>
        <Typography variant="body2">
          * कंपनी के पास अधिकार है कि वे किसी भी ऐड/शर्तों को निलंबित/रद्द करें
          अगर यह गलतफहमी साबित होता है। उदाहरण स्वरूप, वीपीएन/रोबोट-प्रयोग/एक ही
          आईपी से एकाधिक प्रवेश की स्थिति में और अन्य। ध्यान दें: केवल जीतने
          वाली शर्तें ही रद्द की जाएँगी।
        </Typography>
        <Typography variant="body2">
          * कंपनी के पास अधिकार है कि वे किसी भी मैच की कोई भी सौदे (केवल जीतने
          वाली सौदे) किसी भी समय मैच के किसी भी बिंदु पर रद्द करें अगर कंपनी का
          विश्वास होता है कि उस गलत कृत्य हो रहा है खिलाड़ियों द्वारा (चाहे वो
          बैट्समैन/गेंदबाज हों)।
        </Typography>

        <Typography variant="h6" mt={2}>
          BOOKMAKER
        </Typography>
        <Typography variant="body2">
          * किसी भी कारण से किसी भी टीम को फायदा होगा या नुकसान, इसमें हमारी कोई
          जवाबदारी नहीं है
        </Typography>
        <Typography variant="body2">
          * कंपनी के पास किसी भी आईडी/बेटस को हटाने /शून्य करने का अधिकार है,
          यदि वह अमान्य पाया जाता है। उदाहरण के लिए vpn/robot-use/एक ही IP से एक
          से अधिक बेटस एक ही समय में एक से अधिक दांव (पंचिंग) और अन्य के मामले
          में। नोट: केवल जीतने वाली बेट ही रद्द कर दी जाएगी ।
        </Typography>
        <Typography variant="body2">
          * रिजल्ट या सेशन के बारे में किसी भी प्रश्न के लिए रिजल्ट के 4 दिनों
          के भीतर संपर्क किया जाना चाहिए, इसे इवेंट के 4 दिनों के बाद मान्य नहीं
          माना जाएगा।
        </Typography>
        <Typography variant="body2">
          * यदि दो टीमों के अंक समान होते हैं, तो रिजल्ट पॉइंट टेबल के आधार पर
          दिया जाएगा
        </Typography>
        <Typography variant="body2">
          * किसी भी स्थिति में अगर वीडियो बाधित/बंद हो जाता है तो किसी तकनीकी
          समस्या के कारण इसे जारी नहीं रखा जा सकता है बुकमेकर बाजार को रद्द कर
          दिया जाएगा
        </Typography>

        <Typography variant="h6" mt={2}>
          CASINO RULES
        </Typography>
        <Typography variant="body2">
          * 1. यदि किसी कैसिनो गेम में किसी टेक्निकल इशू की वजह से रिजल्ट नहीं
          डलता है तो उस गेम के क्लाइंट को कॉइन वापिस कर दिए जायेंगे, ऐसी स्थिति
          मे कोई वाद विवाद मान्य नहीं होगा
        </Typography>

        <Typography variant="h6" mt={2}>
          FANCY RULES
        </Typography>
        <Typography variant="body2">
          * 1. मैच टाई होने पर सभी फैंसी बेटस मान्य होंगे।
        </Typography>
        <Typography variant="body2">
          * 2. टॉस या खराब मौसम की स्थिति से पहले सभी एडवांस फैंसीयां ससपेंड कर
          दी जाएंगी।
        </Typography>
        <Typography variant="body2">
          * 3 टेक्निकल एरर या किसी भी परिस्थिति में किसी भी फैंसी को कैंसिल कर
          दिया जाता है और इवेंट फिर से शुरू नहीं होता है,तो सभी पिछले दांव मान्य
          होंगे (हार/जीत के आधार पर)।
        </Typography>
        <Typography variant="body2">
          * 4. यदि किसी मामले में गलत रेट फैंसी में दी गई है तो उस फैंसी बेटस को
          रद्द कर दिया जाएगा।
        </Typography>
        <Typography variant="body2">
          * 5.किसी भी परिस्थिति में सभी एक्सचेंज में मैनेजमेंट का निर्णय अंतिम
          होगा। ऑनलाइन पोर्टल में कोई बेमेल होने पर हमारा स्कोरकार्ड मान्य माना
          जाएगा
        </Typography>
        <Typography variant="body2">
          * 6. यदि ग्राहक गलत तरीके से बेट लगाता है तो हम डिलीट करने के लिए
          उत्तरदायी नहीं होंगे, कोई बदलाव नहीं किया जाएगा और बेट को कन्फर्म बेट
          माना जाएगा।
        </Typography>
        <Typography variant="body2">
          * 7. किसी टेक्निकल एरर के कारण मार्किट खुला है और रिजल्ट आ गया है
          रिजल्ट के बाद भी सभी गलत दांव हटा दिए जाएंग। इसमें कोई वाद विवाद मान्य
          नहीं होगा।।
        </Typography>
        <Typography variant="body2">
          * 8. हमारे एक्सचेंज में मैनुअल बेट्स ( फ़ोन कॉल के द्वारा ) स्वीकार
          नहीं किए जाते हैं
        </Typography>
        <Typography variant="body2">
          * 9. हमारा एक्सचेंज हमारे टीवी में 5 सेकंड की देरी प्रदान करेगा।
        </Typography>
        <Typography variant="body2">
          * 10. कंपनी के पास किसी भी आईडी/बेट को अमान्य पाए जाने पर ससपेंड/शून्य
          करने का अधिकार सुरक्षित है। उदाहरण के लिए vpn/robot-use/एक ही IP से कई
          एंट्री/एक ही समय में कई बेट (पंचिंग) और अन्य के मामले में। नोट: केवल
          जीतने वाली बेट को रद्द कर दिया जाएगा, उदाहरण के लिए: यदि हमें किसी भी
          आईडी से ऐसी प्रविष्टियां (ऊपर उल्लिखित) मिलती हैं और उनकी बेट हैं
          (200000 6 ओवर सेशन में 40 की दर से और 200000 48 की दर से वापस) और
          वास्तविक स्कोर 38 है, 40 ले की बेट रद्द कर दी जाएगी और 48 बैक की बेट
          मान्य मानी जाएगी।
        </Typography>
        <Typography variant="body2">
          * 11. कंपनी मैच के किसी भी बिंदु पर किसी भी फैंसी के किसी भी बेटस
          (केवल जीतने वाले दांव) को रद्द करने का अधिकार रखती है यदि कंपनी का
          मानना है कि खिलाड़ियों (या तो बल्लेबाज/गेंदबाज) द्वारा उस फैंसी में
          कोई धोखा/गलत किया जा रहा है।
        </Typography>
        <Typography variant="body2">
          * 12. एक बार जब हमारा एक्सचेंज यूजरनेम और पासवर्ड दे देता है तो
          पासवर्ड बदलने की जिम्मेदारी आपकी होती है।
        </Typography>
        <Typography variant="body2">
          * 13. सभी फैंसी में पेनल्टी रन गिने जाएंगे। (यह नियम 20 मार्च 2024 से
          लागू होगा)
        </Typography>
        <Typography variant="body2">
          * 14. किसी भी गलत गतिविधियों का पता चलने पर यूजर आईडी ब्लॉक कर दिया
          जाएगा, इस संबंध में कोई प्रश्न स्वीकार नहीं किया जाएगा।
        </Typography>
        <Typography variant="body2">
          * 15. क्लाइंट आईडी के दुरुपयोग के लिए हमारा एक्सचेंज जिम्मेदार नहीं
          है।
        </Typography>
        <Typography variant="body2">
          * 16.नो बॉल के मामले में, गलत बेटस हटा दिए जाएंगे, तो अंतिम निर्णय
          मैनेजमेंट का होगा।
        </Typography>
        <Typography variant="body2">
          * 17.मैच अबॉण्डेड या खराब मौसम होने पर जो सेशन, पार्टनरशिप और खिलाडी
          रनिंग में है या खिलाडी रिटायर हुआ है वो रनिंग सौदे केंसल नहीं होंगे ।
          और जो सेशन कम्पलीट है उनके हिसाब से कोइन्स कम या ज्यादा होंगे। और
          रिजल्ट आने पे जो खिलाडी जहा है वो वही माने जायेंगे।
        </Typography>

        <Typography variant="h6" mt={2}>
          लूडो नियम
        </Typography>
        <Typography variant="body2">
          * 1. अगर कोई क्लाइंट लूडो क्विक टेबल में एंट्री करता है और वह बिना गेम
          खेले खत्म करे एग्जिट करे तो उसकी राशि नुकसान में मान्य होगी ।
        </Typography>

        <Typography variant="h6" mt={2}>
          टॉस के नियम
        </Typography>
        <Typography variant="body2">
          * 1. मैच शुरू होने से 1 घंटे पहले तक दांव स्वीकार किए जाएंगे
        </Typography>
        <Typography variant="body2">
          * 1.1 उदाहरण - यदि मैच रात 9:30 बजे शुरू होता है तो दांव रात 8:30 बजे
          तक स्वीकार किए जाएंगे
        </Typography>
        <Typography variant="body2">
          * 1.2 उदाहरण - यदि कोई मैच शाम 6:30 बजे है और वह 5:30 बजे शुरू होता है
          तो नियमों के अनुसार मैच शुरू होने से 1 घंटे पहले तक दांव स्वीकार किए
          जाएंगे।
        </Typography>

        <Typography variant="h6" mt={2}>
          BOWLER RUN FANCY
        </Typography>
        <Typography variant="body2">
          * फैंसी में केवल टोटल बॉलर दुवारा दिए गए रन ही मान्य होंगे। टीम के लेग
          बाई और बाई बॉलर फैंसी में ऐड नहीं किये जायँगे
        </Typography>
        <Typography variant="body2">
          * ओनली ओवर रन फैंसी में टोटल उस ओवर में दिए गए रन मान्य होंगे जिसमे
          एक्स्ट्रास और बैट्समैन दुवारा बनाये गए रन मन्ये होंगे
        </Typography>

        <Typography variant="h6" mt={2}>
          TEST RULES
        </Typography>
        <Typography variant="body2">
          * 1.1 एडवांस सेशन टेस्ट में मान्य है
        </Typography>
        <Typography variant="body2">
          * 1.2 घोषित पारी या ऑल आउट के कारण मध्य सेशन और सेशन पूरा नहीं हुआ है,
          इसलिए विशेष ओवर को पूरा माना जाता है और शेष ओवर को अगली टीम पारी में
          गिना जाता है: - घोषित पारी या ऑल आउट के मामले में 131.5वें ओवर में 132
          ओवर माना जाता है मध्य सेशन में 133 के लिए बचे हुए 1 ओवर को पूरा किया
          गया और अगली टीम की पारी से 135 ओवर के सेशन के लिए 3 ओवर गिने गए और एक
          ओवर का सेशन घोषित किया गया और पारी घोषित होने के कारण केवल ओवर का सेशन
          पूरा नहीं हुआ, ताकि सेशन के विशेष दांव को हटा दिया जाएगा और सभी पर
          विचार किया जाएगा पूर्व के लिए मान्य:- 131.5वें ओवर में घोषित पारी के
          मामले में 132 ओवर हटा दिए जाएंगे और यदि ऑल आउट हुए तो 132 ओवर और केवल
          132 ओवर ही मान्य होंगे।
        </Typography>
        <Typography variant="body2">
          * 1.6 टेस्ट मैच दोनों इनिंग में एडवांस फैंसी मान्य हैं।
        </Typography>

        <Typography variant="h6" mt={2}>
          2 टेस्ट लंबी/इनिंग रन:-
        </Typography>
        <Typography variant="body2">
          * 2.2 यदि मौसम की स्थिति के कारण मैच रोक दिया गया है तो सभी लंबी फैंसी
          को हटा दिया जाएगा।
        </Typography>
        <Typography variant="body2">
          * 2.3 टेस्ट में लंबी पारी/इनिंग रन दोनों एडवांस सेशन मान्य हैं।
        </Typography>

        <Typography variant="h6" mt={2}>
          3 टेस्ट बल्लेबाज :-
        </Typography>
        <Typography variant="body2">
          * 3.1 बल्लेबाज के चोटिल होने की स्थिति में अगर बल्लेबाज 34 रन पर है तो
          फाइनल रिजल्ट में 34 रन ही दिए जायँगे
        </Typography>
        <Typography variant="body2">
          * 3.2 बल्लेबाज 50/100 रन पर अगर बल्लेबाज घायल हो जाता है रिजल्ट उसके
          रन पर दिया जाएगा।
        </Typography>
        <Typography variant="body2">
          * 3.3 अगले बैट्समैन आउट फैंसी में अगर खिलाड़ी घायल हो जाता है तो
          एडवांस फैंसी को हटा दिया जाएगा।
        </Typography>
        <Typography variant="body2">
          * 3.4 एडवांस फैंसी में ओपनिंग बैट्समैन ही मान्य है यदि वही बैट्समैन
          ओपनिंग में आए तो फैंसी मान्य होगा यदि एक बैट्समैन को बदल दिया जाता है
          तो उस एडवांस फैंसी को हटा दिया जाएगा।
        </Typography>
        <Typography variant="body2">
          * 3.5 टेस्ट मैच में दोनों एडवांस बैट्समैन फैन्सी मान्य हैं।
        </Typography>

        <Typography variant="h6" mt={2}>
          4 टेस्ट पार्टनरशिप:-
        </Typography>
        <Typography variant="body2">
          * 4.1 पार्टनरशिप में एक बल्लेबाज घायल होता है तो अगले बल्लेबाज के साथ
          पार्टनरशिप जारी रहती है।
        </Typography>
        <Typography variant="body2">
          * 4.2 मौसम की स्थिति के कारण पार्टनरशिप और खिलाड़ी चलता है या मैच रद्द
          कर दिया जाता है, फाइनल रिजल्ट स्कोर के अनुसार दिया जाएगा।
        </Typography>
        <Typography variant="body2">
          * 4.3 दोनों खिलाड़ियों के अलग या समान होने की स्थिति में पार्टनरशिप
          मान्य है।
        </Typography>
        <Typography variant="body2">
          * 4.4 टेस्ट मैच में दोनों एडवांस फैंसी पार्टनरशिप मान्य है।
        </Typography>

        <Typography variant="h6" mt={2}>
          5 अन्य एडवांस फैंसी (TEST):-
        </Typography>
        <Typography variant="body2">
          * 5.1 चार, छक्के, वाइड, विकेट, अतिरिक्त रन, कुल रन, उच्चतम ओवर और
          शीर्ष बल्लेबाज तभी मान्य होते हैं जब 300 ओवर खेले गए हों या मैच किसी
          भी टीम द्वारा जीता गया हो अन्यथा इन सभी फैंसी को हटा दिया जाएगा। इसके
          अतिरिक्त सभी इवेंट्स केवल पहली पारी के लिए मान्य हैं (यह सभी व्यक्तिगत
          टीम इवेंट्स पर भी लागू होता है)
        </Typography>

        <Typography variant="h6" mt={2}>
          2 ODI नियम:-
        </Typography>
        <Typography variant="body2">
          * मैच का पहला ओवर रन एडवांस फैंसी केवल पहली पारी के रन गिने जाएंगे।
        </Typography>
        <Typography variant="body2">
          * बारिश या मैच रद्द होने की स्थिति में कम्प्लीट फैंसी मान्य
          है,इन्कम्प्लीट फैंसी हटा दि जाएंगे।।और जो पार्टनरशिप,फॉलऑफ़ विकेट,और
          खिलाडी रनिंग में है उनका फाइनल रिजल्ट उनके रनो पर ही दिया जायगा
        </Typography>
        <Typography variant="body2">
          * उदाहरण के लिए: - 35 ओवर रन टीम ए किसी भी मामले में खेल रही है, टीम ए
          33 ओवर में ऑल-आउट हो गई है, टीम ए ने 150 रन बना लिए हैं, फैंसी फाइनल
          रिजल्ट उस रन पर मान्य किया जाता है।
        </Typography>
        <Typography variant="body2">
          * एडवांस फैंसी केवल पहली पारी में मान्य है।
        </Typography>
        <Typography variant="body2">
          * 50 ओवर पूरा नहीं होने की स्थिति में मौसम या किसी भी स्थिति के कारण,
          सभी बेट हटा दिए जाएंगे।
        </Typography>
        <Typography variant="body2">
          * एडवांस 50 ओवर रन केवल पहली पारी में मान्य है।
        </Typography>

        <Typography variant="h6" mt={2}>
          वनडे बल्लेबाज रन :-
        </Typography>
        <Typography variant="body2">
          * बल्लेबाज के चोटिल होने की स्थिति में अगर बल्लेबाज 34 रन पर है तो
          फाइनल रिजल्ट में 34 रन ही दिए जायँगे ।
        </Typography>
        <Typography variant="body2">
          * अगले बैट्समैन आउट फैंसी में अगर खिलाड़ी घायल हो जाता है तो एडवांस
          फैंसी को हटा दिया जाएगा।
        </Typography>
        <Typography variant="body2">
          * एडवांस फैंसी में ओपनिंग बैट्समैन ही मान्य है यदि वही बैट्समैन ओपनिंग
          में आए तो फैंसी मान्य होगा| यदि एक बैट्समैन को बदल दिया जाता है तो उस
          एडवांस फैंसी को हटा दिया जाएगा।
        </Typography>

        <Typography variant="h6" mt={2}>
          वनडे पार्टनरशिप रन:-
        </Typography>
        <Typography variant="body2">
          * पार्टनरशिप में एक बल्लेबाज घायल होता है तो अगले बल्लेबाज की
          पार्टनरशिप जारी रहती है।
        </Typography>
        <Typography variant="body2">
          * दोनों खिलाड़ियों के अलग या समान होने की स्थिति में एडवांस सेशन
          पार्टनरशिप मान्य है।
        </Typography>
        <Typography variant="body2">
          * दोनों टीम की एडवांस पार्टनरशिप मैच में मान्य हैं।
        </Typography>

        <Typography variant="h6" mt={2}>
          Extra Sessions :-
        </Typography>
        <Typography variant="body2">
          * चार, छक्के, वाइड, विकेट, अतिरिक्त रन, कुल रन, उच्चतम ओवर, शीर्ष
          बल्लेबाज, मेडेन ओवर, कैच आउट, नो बॉल, रन आउट, अर्धशतक और शतक मान्य हैं
          केवल बारिश के कारण मैच पूरा हो गया है ओवर कम कर दिया गया है तो अन्य
          सभी फैंसी हटा दिए जाएंगे।
        </Typography>

        <Typography variant="h6" mt={2}>
          T20 SESSION-
        </Typography>
        <Typography variant="body2">
          * मैच का पहला ओवर रन एडवांस फैंसी केवल पहली पारी के रन गिने जाएंगे।
        </Typography>
        <Typography variant="body2">
          * बारिश या मैच रद्द होने की स्थिति में कम्प्लीट फैंसी मान्य
          है,इन्कम्प्लीट फैंसी हटा दि जाएंगे।।और जो पार्टनरशिप,फॉलऑफ़ विकेट,और
          खिलाडी रनिंग में है उनका फाइनल रिजल्ट उनके रनो पर ही दिया जायगा ।।
        </Typography>
        <Typography variant="body2">
          * उदाहरण के लिए: - 35 ओवर रन टीम ए किसी भी मामले में खेल रही है, टीम ए
          33 ओवर में ऑल-आउट हो गई है, टीम ए ने 150 रन बना लिए हैं, फैंसी फाइनल
          रिजल्ट उस रन पर मान्य किया जाता है।
        </Typography>
        <Typography variant="body2">
          * एडवांस फैंसी केवल पहली पारी में मान्य है।
        </Typography>
        <Typography variant="body2">
          * एडवांस 20 ओवर रन केवल पहली पारी में मान्य है। 20 ओवर का रन मान्य
          नहीं माना जाएगा यदि 20 ओवर किसी भी स्थिति में पूरा नहीं होता है
        </Typography>

        <Typography variant="h6" mt={2}>
          टी20 बल्लेबाज रन :-
        </Typography>
        <Typography variant="body2">
          * बल्लेबाज के चोटिल होने की स्थिति में अगर बल्लेबाज 34 रन पर है तो
          फाइनल रिजल्ट में 34 रन ही दिए जायँगे ।
        </Typography>
        <Typography variant="body2">
          * अगले बैट्समैन आउट फैंसी में अगर खिलाड़ी घायल हो जाता है तो एडवांस
          फैंसी को हटा दिया जाएगा।
        </Typography>
        <Typography variant="body2">
          * एडवांस में ओपनिंग बैट्समैन ही मान्य है अगर वही बैट्समैन ओपनिंग में
          आए तो फैंसला मान्य होगा यदि एक बैट्समैन को बदल दिया जाता है तो उस
          विशेष खिलाड़ी को हटा दिया जाएगा।
        </Typography>

        <Typography variant="h6" mt={2}>
          टी20 पार्टनरशिप रन:-
        </Typography>
        <Typography variant="body2">
          * पार्टनरशिप में एक बल्लेबाज घायल होता है तो अगले बल्लेबाज की
          पार्टनरशिप जारी रहती है।
        </Typography>
        <Typography variant="body2">
          * दोनों खिलाड़ियों के अलग या समान होने की स्थिति में पार्टनरशिप मान्य
          है।
        </Typography>
        <Typography variant="body2">
          * दोनों टीम एडवांस पार्टनरशिप मैच में मान्य हैं।
        </Typography>
        <Typography variant="body2">
          * एडवांस SESSION केवल पहली पारी में मान्य है।
        </Typography>
        <Typography variant="body2">
          * अगर बारिश या मौसम की स्थिति के कारण ओवर कम हो जाता है या मैच रद्द हो
          जाता है तो फाइनल रिजल्ट स्कोर के अनुसार दिया जाएगा।
        </Typography>

        <Typography variant="h6" mt={2}>
          EXTRA FANCY :-
        </Typography>
        <Typography variant="body2">
          * टी-20, वन डे और टेस्ट मैच में अगर मौजूदा पारी खिलाड़ी और पार्टनरशिप
          मैच के बीच में चल रही हो तो उसे रद्द कर दिया जाता है या छोड़ दिया जाता
          है उस स्थिति में सभी मौजूदा खिलाड़ी और साझेदारी के फाइनल रिजल्ट मान्य
          होते हैं।
        </Typography>
        <Typography variant="body2">
          * चौका, छक्का, वाइड, विकेट, अतिरिक्त रन, कुल रन, उच्चतम ओवर और शीर्ष
          बल्लेबाज, मेडेन ओवर, कैच आउट, नो बॉल, रन आउट, अर्धशतक और शतक मान्य हैं
          केवल बारिश के कारण मैच पूरा हो गया है ओवर कम कर दिया गया है अन्य सभी
          फैंसी हटा दिए जाएंगे।
        </Typography>
        <Typography variant="body2">
          * पहली 6 ओवर डॉट बॉल और 20 ओवर डॉट बॉल फैंसी केवल पहली पारी ही मान्य
          है।
        </Typography>
        <Typography variant="body2">
          * किसी भी टीम की गेंदों पर पहला विकेट गंवाने का मतलब है कि किसी भी टीम
          का पहला विकेट कितनी गेंदों में गिर जाता है, कम से कम न्यूनतम एक गेंद
          खेली जानी चाहिए अन्यथा बेट हटा दी जाएगी।
        </Typography>
        <Typography variant="body2">
          * किसी भी टीम का पहला विकेट FALL दोनों पारियों में मान्य है
        </Typography>
        <Typography variant="body2">
          * किसी भी टीम ने 50 रन के लिए कितनी गेंदों का मतलब है कि किसी भी टीम
          ने 50 रन हासिल किए हैं, उस विशेष गेंद को कितनी गेंदों में कम से कम एक
          गेंद खेलनी होगी अन्यथा वह फैंसी दांव हटा दिया जाएगा।
        </Typography>
        <Typography variant="body2">
          * 50 रन के लिए कितनी गेंदों पर किसी भी टीम को केवल पहली पारी ही मान्य
          होती है।
        </Typography>
        <Typography variant="body2">
          * पहली 6 इनिंग बाउंड्री रन किसी भी टीम के फैन्स की गिनती केवल रन बनाए
          गए चौकों और छक्कों के हिसाब से की जाएगी, कम से कम 6 ओवर खेले जाने
          चाहिए अन्यथा वह फ़ैन्सी हटा दी जाएगी।
        </Typography>
        <Typography variant="body2">
          * पहली पारी में 6 ओवर की बाउंड्री किसी भी टीम के रन जैसे वाइड, नो-बॉल,
          लेग-बाय, बाई और ओवर थ्रो के रन इस फैंसी में नहीं गिने जाते हैं।
        </Typography>
        <Typography variant="body2">
          * किसी भी बल्लेबाज का सामना कितनी गेंदों से होता है मतलब कि कोई भी
          बल्लेबाज कितनी गेंदों का खेलता है उस में कम से कम एक गेंद खेलनी होती
          है अन्यथा वह फैंसी दांव हटा दिया जाएगा।
        </Typography>
        <Typography variant="body2">
          * किसी भी बल्लेबाज द्वारा कितनी गेंदों का सामना करना दोनों पारियों में
          मान्य है।
        </Typography>
        <Typography variant="body2">
          * सबसे कम स्कोरिंग ओवर को तभी मान्य माना जाएगा जब ओवर पूरी तरह से पूरा
          हो गया हो (सभी छह गेंदें फेंकी जानी हैं)
        </Typography>

        <Typography variant="h6" mt={2}>
          टेस्ट में कनकशन:-
        </Typography>
        <Typography variant="body2">
          * सेशन अधूरा होने की स्थिति में, एक ओवर सेशन के सभी बेट्स हटा दिए
          जाएंगे। उदाहरण के लिए पारी की घोषणा या मैच खराब रोशनी या किसी अन्य
          स्थिति में ससपेंड ।
        </Typography>
        <Typography variant="body2">
          * 1. सभी बेट्स को मान्य माना जाएगा यदि किसी खिलाड़ी को कनकशन
          सब्स्टीट्यूट के तहत बदल दिया गया है, रिजल्ट उल्लिखित खिलाड़ी द्वारा
          बनाए गए रनों के लिए दिया जाएगा। उदाहरण के लिए डीएम ब्रावो 23 रन पर
          रिटायर्ड हर्ट हो जाते हैं, तो रिजल्ट 23 के लिए दिया जाएगा।
        </Typography>
        <Typography variant="body2">
          * 2. कनकशन सब्स्टीट्यूट के तहत दोनों खिलाड़ियों के दांव मान्य होंगे।
        </Typography>

        <Typography variant="h6" mt={2}>
          Total Match- Events (test):-
        </Typography>
        <Typography variant="body2">
          * पूरे टेस्ट मैच में कम से कम 300 ओवर फेंके जाने चाहिए, अन्यथा विशेष
          इवेंट से संबंधित सभी बेट्स अमान्य हो जाएंगे। उदाहरण के लिए, कैच आउट का
          टोटल मैच केवल तभी मान्य होगा जब किसी विशेष टेस्ट मैच में 300 ओवर फेंके
          गए हों
        </Typography>

        <Typography variant="h6" mt={2}>
          Limited over events-Test::-
        </Typography>
        <Typography variant="body2">
          * इस इवेंट को केवल तभी मान्य माना जाएगा जब विशेष इवेंट पर परिभाषित
          ओवरों की संख्या फेंकी गई हो, अन्यथा इस इवेंट से संबंधित सभी दांव शून्य
          हो जाएंगे। उदाहरण के लिए 0-25 ओवर की घटनाएँ तभी मान्य होंगी जब 25 ओवर
          फेंके गए हों, अन्यथा उसे मान्य नहीं माना जाएगा
        </Typography>
        <Typography variant="body2">
          * यदि टीम किसी भी परिभाषित ओवर से पहले ऑल आउट हो जाती है, तो शेष ओवरों
          को अगली पारी में गिना जाएगा। उदाहरण के लिए यदि टीम 23.1 ओवर में ऑल आउट
          हो जाती है तो उसे 24 ओवर माना जाएगा और शेष ओवर अगली पारी से गिने
          जाएंगे।
        </Typography>

        <Typography variant="h6" mt={2}>
          बॉलर विकेट इवेंट्स- टेस्ट:-
        </Typography>
        <Typography variant="body2">
          * कम से कम एक ओवर (एक पूर्ण ओवर) गेंदबाज द्वारा फेंका जाना चाहिए,
          अन्यथा उसे मान्य नहीं माना जाएगा
        </Typography>

        <Typography variant="h6" mt={2}>
          बॉलर ओवर इवेंट्स- टेस्ट:-
        </Typography>
        <Typography variant="body2">
          * उल्लिखित गेंदबाज को निर्धारित ओवरों की संख्या को पूरा करना होगा,
          अन्यथा उस विशेष इवेंट से संबंधित दांव शून्य हो जाएंगे। उदाहरण के लिए
          यदि उल्लिखित गेंदबाज ने 8 ओवर फेंके हैं, तो उस विशेष गेंदबाज के 5 ओवर
          के रन को मान्य माना जाएगा और 10 ओवर के रन को अमान्य कर दिया जाएगा।
        </Typography>

        <Typography variant="h6" mt={2}>
          प्लेयर बॉल इवेंट्स- टेस्ट:-
        </Typography>
        <Typography variant="body2">
          * इस इवेंट को तभी मान्य माना जाएगा जब उल्लिखित खिलाड़ी द्वारा बनाए गए
          रनों की परिभाषित संख्या, अन्यथा रिजल्ट 0 (शून्य) गेंदों के रूप में
          माना जाएगा।
        </Typography>
        <Typography variant="body2">
          * उदाहरण के लिए यदि रूट 60 गेंदों में 20 रन बनाता है और 22 रन पर आउट
          हो जाता है, तो 20 रन का रिजल्ट 60 गेंदों का होगा और 25 रन के लिए
          आवश्यक गेंदों का रिजल्ट 0 (शून्य) माना जाएगा और वही दिया जाएगा नतीजा
        </Typography>

        <Typography variant="h6" mt={2}>
          लिमिटेड ओवर इवेंट-वनडे:-
        </Typography>
        <Typography variant="body2">
          * इस इवेंट को केवल तभी मान्य माना जाएगा जब विशेष इवेंट पर परिभाषित
          ओवरों की संख्या फेंकी गई हो, अन्यथा इस इवेंट से संबंधित सभी दांव शून्य
          हो जाएंगे। 0-50 ओवर की घटनाएँ केवल 50 ओवर पूरे होने पर ही मान्य होंगी,
          यदि पहले बल्लेबाजी करने वाली टीम 50 ओवर से पहले ऑल आउट हो जाती है तो
          शेष ओवर की गणना दूसरी पारी से की जाएगी। उदाहरण के लिए यदि पहले
          बल्लेबाजी करने वाली टीम 35 ओवरों में ऑल आउट हो जाती है तो शेष 15 ओवर
          दूसरी पारी से गिने जाएंगे, यदि टीम निर्धारित ओवरों की संख्या से पहले
          ऑल आउट हो जाती है तो यह सभी घटनाओं पर लागू होता है।
        </Typography>
        <Typography variant="body2">
          * यदि मैच में किसी भी स्थिति में ओवर कम हो जाता है, तो अधूरी रहने वाली
          इवेंट को रद्द कर दिया जाएगा, उदाहरण के लिए यदि बारिश / खराब रोशनी के
          कारण 15 ओवरों में मैच बाधित हो जाता है और इस ओवर को कम कर दिया जाता
          है। 0-10 के लिए इवेंट मान्य होंगे, इस प्रकार से संबंधित अन्य सभी इवेंट
          हटा दिए जाएंगे।
        </Typography>
        <Typography variant="body2">
          * यह ईवेंट तभी मान्य होगा जब ओवर की परिभाषित संख्या पूरी हो गई हो।
          उदाहरण के लिए पहले बल्लेबाजी करने वाली टीम 29.4 ओवर में ऑल आउट हो जाती
          है तो उसे 30 ओवर माना जाएगा, बाद में बल्लेबाजी करने वाली टीम को 20 ओवर
          पूरे करने होंगे तभी 0-50 ओवर को मान्य माना जाएगा। यदि दूसरी बल्लेबाजी
          करने वाली टीम 19.4 ओवर में ऑल आउट हो जाती है तो 0-50 ओवर की इवेंट को
          मान्य नहीं माना जाएगा, यह केवल पहली पारी के लिए मान्य है।
        </Typography>

        <Typography variant="h6" mt={2}>
          बॉलर इवेंट- ODI:-
        </Typography>
        <Typography variant="body2">
          * उल्लिखित गेंदबाज को निर्धारित ओवरों की संख्या को पूरा करना होगा,
          अन्यथा उस विशेष इवेंट से संबंधित दांव शून्य हो जाएंगे। उदाहरण के लिए
          यदि उल्लिखित गेंदबाज ने 8 ओवर फेंके हैं, तो उस विशेष गेंदबाज के 5 ओवर
          के रन को मान्य माना जाएगा और 10 ओवर के रन को अमान्य कर दिया जाएगा।
        </Typography>
        <Typography variant="body2">* दोनों पारियां मान्य हैं</Typography>

        <Typography variant="h6" mt={2}>
          अन्य इवेंट - टी20
        </Typography>
        <Typography variant="body2">
          * 1-10 ओवर और 11-20 ओवर की इवेंट को तभी मान्य माना जाएगा जब उल्लिखित
          ओवर की संख्या पूरी तरह से खेली गई हो। हालाँकि यदि किसी विशेष इवेंट से
          पहले ओवर कम हो जाता है तो वह अमान्य हो जाएगा, यदि पहले बल्लेबाजी करने
          वाली टीम 20 ओवर से पहले ऑल आउट हो जाती है तो शेष ओवर की गणना दूसरी
          पारी से की जाएगी। उदाहरण के लिए यदि पहले बल्लेबाजी करने वाली टीम 17
          ओवर में ऑल आउट हो जाती है तो शेष 3 ओवर दूसरी पारी से गिने जाएंगे और
          सभी घटनाओं के 3 ओवर गिने जाएंगे। यह केवल पहली पारी के लिए मान्य है।
        </Typography>
        <Typography variant="body2">
          * यदि किसी रनिंग इवेंट के बीच ओवर कम हो जाता है, तो उसे मान्य माना
          जाएगा और बाकी को रद्द कर दिया जाएगा। उदाहरण के लिए.., मैच शुरू हुआ और
          बारिश/खराब रोशनी या किसी अन्य स्थिति के कारण मैच 4 ओवर में बाधित हो
          गया और बाद में ओवर कम हो गया। फिर 1-10 के लिए इवेंट मान्य हैं बाकी सभी
          रद्द कर दिए जाएंगे
        </Typography>
        <Typography variant="body2">
          * बॉलर सेशन: बॉलर सेशन एडवांस इवेंट केवल पहली इनिंग के लिए मान्य। यह
          इवेंट तभी मान्य होती है जब गेंदबाज ने अपने ओवरों का अधिकतम कोटा पूरा
          कर लिया हो, अन्यथा उसे रद्द कर दिया जाएगा। हालाँकि यदि मैच का रिजल्ट आ
          गया है और उस गेंदबाज ने पहले ही अपना अंतिम ओवर फेंकना शुरू कर दिया है
          तो रिजल्ट दिया जाएगा भले ही उसने ओवर पूरा नहीं किया हो। उदाहरण के लिए
          बी कुमार अपना अंतिम ओवर फेंक रहे हैं और 3.4 पर मैच का रिजल्ट आया है तो
          रिजल्ट बी कुमार के ओवर रन के लिए दिया जाएगा
        </Typography>
        <Typography variant="body2">
          * डीएलएस के मामले में, ओवर कम हो गया तो जिस गेंदबाज ने पहले से ही उस
          रिजल्ट का अपना अधिकतम कोटा डाला है, उसे मान्य माना जाएगा और बाकी को
          रद्द कर दिया जाएगा।
        </Typography>

        <Typography variant="h6" mt={2}>
          डॉट बॉल इवेंट:
        </Typography>
        <Typography variant="body2">
          * केवल कोई रन नहीं होने पर डॉट बॉल मानी जाएगी।
        </Typography>
        <Typography variant="body2">
          * अगर विकेट का मतलब है कि डॉट बॉल नहीं गिना जाएगा।
        </Typography>
        <Typography variant="body2">
          * फ्री हिट पर बाउंड्री हिट को ही मान्य माना जाएगा
        </Typography>
        <Typography variant="body2">
          * उल्लिखित मैच में कोई फ्री हिट नहीं होने पर बेट्स को हटा दिया जाएगा
        </Typography>
        <Typography variant="body2">
          * बल्ले से बाउंड्री मान्य मानी जाएगी
        </Typography>
        <Typography variant="body2">* चार और छह दोनों मान्य हैं</Typography>
        <Typography variant="body2">
          * बल्लेबाज की बैट बाउंड्री को ही मान्य माना जाता है
        </Typography>
        <Typography variant="body2">* फ्री हिट सीमाएं भी मान्य हैं</Typography>
        <Typography variant="body2">
          * यदि उस गेंद को पूरा नहीं किया जाता है तो बेट्स को रद्द कर दिया जाएगा
        </Typography>
        <Typography variant="body2">
          * रिजल्ट 0 या 4 (नहीं या हां) दिया जाएगा। उदाहरण के लिए बल्लेबाज गेंद
          पर चौका मारने का मतलब रिजल्ट 0 है अन्यथा रिजल्ट 4 है।
        </Typography>

        <Typography variant="h6" mt={2}>
          * बिग बैश में पावर सर्ज नियम
        </Typography>
        <Typography variant="body2">
          * पावर प्ले पहले चार ओवर + पावर सर्ज दो ओवर-बल्लेबाज पसंद
        </Typography>
        <Typography variant="body2">
          * बल्लेबाजी पक्ष चुनता है कि पावर सर्ज के साथ कब करना है।
        </Typography>
        <Typography variant="body2">
          * पारी की शुरुआत में अभी भी चार ओवर का पावर प्ले है, लेकिन अब
          बल्लेबाजी करने वाली टीम 11वें ओवर के बाद से किसी भी समय अन्य दो पावर
          सर्ज ओवर ले सकती है।
        </Typography>
        <Typography variant="body2">
          * रिजल्ट या दर के बारे में किसी भी प्रश्न के लिए इवेंट से 4 दिनों के
          भीतर संपर्क करना होगा, इवेंट से 4 दिनों के बाद को मान्य नहीं माना
          जाएगा
        </Typography>
      </div>

      <div ref={englishRef}>
        <Typography variant="h6" mt={4}>
          bookmaker
        </Typography>
        <Typography variant="body2">
          * Due to any reason any team will be getting advantage or disadvantage
          we are not concerned.
        </Typography>
        <Typography variant="body2">
          * Company reserves the right to suspend/void any id/bets if the same
          is found to be illegitimate. For example incase of
          vpn/robot-use/multiple entry from same IP/ multiple bets at the same
          time (Punching) and others. Note : only winning bets will be voided .
        </Typography>
        <Typography variant="body2">
          * Any query about the result or rates should be contacted within 4
          days of the specific event, the same will not be considered valid post
          4 days from the event.
        </Typography>
        <Typography variant="body2">
          * If two team ends up with equal points, then result will be given
          based on the official point table
        </Typography>
        <Typography variant="body2">
          * At any situation if the video gets interrupted/stopped then the same
          cannot be continued due to any technical issues bookmaker market will
          be voided
        </Typography>
        <Typography variant="body2">
          * Company reserves the right to suspend/void any id/bets if the same
          is found to be illegitimate. For example incase of
          VPN/robot-use/multiple entry from same IP and others. Note : only
          winning bets will be voided.
        </Typography>
        <Typography variant="body2">
          * Company reserves the right to void any bets (only winning bets) of
          any event at any point of the match if the company believes there is
          any cheating/wrong doing in that particular event by the players
          (either batsman/bowler)
        </Typography>

        <Typography variant="h6" mt={2}>
          Fancy
        </Typography>
        <Typography variant="body2">
          * 1. All fancy bets will be validated when match has been tied.
        </Typography>
        <Typography variant="body2">
          * 2. All advance fancy will be suspended before toss or weather
          condition.
        </Typography>
        <Typography variant="body2">
          * 3. In case technical error or any circumstances any fancy is
          suspended and does not resume result will be given all previous bets
          will be valid (based on haar/jeet).
        </Typography>
        <Typography variant="body2">
          * 4. If any case wrong rate has been given in fancy that particular
          bets will be cancelled.
        </Typography>
        <Typography variant="body2">
          * 5. In any circumstances management decision will be final related to
          all exchange items. Our scorecard will be considered as valid if there
          is any mismatch in online portal
        </Typography>
        <Typography variant="body2">
          * 6. In case customer make bets in wrong fancy we are not liable to
          delete, no changes will be made and bets will be consider as confirm
          bet.
        </Typography>
        <Typography variant="body2">
          * 7. Due to any technical error market is open and result has came all
          bets after result will be deleted.
        </Typography>
        <Typography variant="body2">
          * 8. Manual bets(via phone call) are not accepted in our exchange
        </Typography>
        <Typography variant="body2">
          * 9.Our exchange will provide 5 second delay in our tv.
        </Typography>
        <Typography variant="body2">
          * 10. Company reserves the right to suspend/void any id/bets if the
          same is found to be illegitimate. For example incase of
          vpn/robot-use/multiple entry from same IP/ multiple bets at same time
          (Punching) and others. Note : only winning bets will be voided, For
          example: If we find such entries (above mentioned) from any id and
          their bets are (200000 lay in a 6 over session for the rate 40 and
          200000 back for the rate of 48) and the actual score is 38, bets of 40
          lay will be voided and the bets for 48 back will be considered valid.
        </Typography>
        <Typography variant="body2">
          * 11. Company reserves the right to void any bets (only winning bets)
          of any event at any point of the match if the company believes there
          is any cheating/wrong doing in that particular event by the players
          (either batsman/bowler).
        </Typography>
        <Typography variant="body2">
          * 12. Once our exchange give username and password it is your
          responsibility to change a password.
        </Typography>
        <Typography variant="body2">
          * 13. Penalty runs will be counted in all fancy. ( This rule
          applicable from 20th March 2024 )
        </Typography>
        <Typography variant="body2">
          * 14.Traders will be block the user ID if find any misinterpret
          activities, No queries accept regarding.
        </Typography>
        <Typography variant="body2">
          * 15. Our exchange is not responsible for misuse of client id.
        </Typography>
        <Typography variant="body2">
          * 16.in case of NO BALL, wrong bets will be delete, the final decision
          will be management.
        </Typography>
        <Typography variant="body2">
          * 17.In case of match abandoned or bad weather, the running
          partnership and player runs or player retired will not be cancelled.
          And according to the session which is complete, the coins will be more
          or less. And the players who are where they are after the result it
          will be considered.
        </Typography>

        <Typography variant="h6" mt={2}>
          Ludo Rules
        </Typography>
        <Typography variant="body2">
          * 1. If a client enters the Ludo Quick Table and exits without
          finishing the game play, his amount will be considered as loss.
        </Typography>

        <Typography variant="h6" mt={2}>
          Toss Rules
        </Typography>
        <Typography variant="body2">
          * 1. Bets will be accepted up to 1 hour before the match starts
        </Typography>
        <Typography variant="body2">
          * 1.1 Example- If a match is at 6:30pm and it starts at 5:30pm then as
          per the rules the bets will be accepted till 1 hour before the match
          starts.
        </Typography>
        <Typography variant="body2">
          * 1.2 Example- If a match is at 6:30pm and it starts at 5:30pm then as
          per the rules the bets will be accepted till 1 hour before the match
          starts.
        </Typography>

        <Typography variant="h6" mt={2}>
          BOWLER RUN FANCY
        </Typography>
        <Typography variant="body2">
          * In fancy total runs scored by the bowler will be valid. Extra runs
          of the team will not be added to the bowler's fancy
        </Typography>
        <Typography variant="body2">
          * only over run fancy, the total runs scored in that over will be
          valid, in which the extras and runs scored by the batsmen will be
          counted.
        </Typography>

        <Typography variant="h6" mt={2}>
          Test
        </Typography>
        <Typography variant="body2">
          * 1.1 Complete session valid in test.
        </Typography>
        <Typography variant="body2">
          * 1.2 Middle session and Session is not completed due to Innings
          declared or all out so that particular over considered as completed
          and remaining over counted in next team Innings for ex:- In case of
          Innings declared or all out In 131.5th over Considered as 132 over
          completed remaining 1 over counted for 133 over middle session and 3
          over counted for 135 over session from next team Innings and One over
          session and Only over session is not completed due to innings declared
          so that Particular over session bets will be deleted and all out
          considered as valid for ex:- In case of Innings declared In 131.5th
          over so 132 over will be deleted and if all out then 132 over and Only
          132 over will be Valid.
        </Typography>
        <Typography variant="body2">
          * 1.3 Test match both advance session is valid.
        </Typography>

        <Typography variant="h6" mt={2}>
          2 Test lambi/ Inning run:-
        </Typography>
        <Typography variant="body2">
          * 2.2 In case due to weather situation match has been stopped all
          lambi trades will be deleted.
        </Typography>
        <Typography variant="body2">
          * 2.3 In test both lambi paari / inning run is valid in advance fancy.
        </Typography>

        <Typography variant="h6" mt={2}>
          3 Test batsman:-
        </Typography>
        <Typography variant="body2">
          * 3.1 In case batsmen is injured he/she is made 34 runs the result
          will be given 34 runs.
        </Typography>
        <Typography variant="body2">
          * 3.2 Batsman 50/100 run if batsman is injured or declaration the
          result will be given on particular run.
        </Typography>
        <Typography variant="body2">
          * 3.3 In next men out fancy if player is injured particular fancy will
          be deleted.
        </Typography>
        <Typography variant="body2">
          * 3.4 In advance fancy opening batsmen is only valid if same batsmen
          came in opening the fancy will be valid in case one batsmen is changed
          that particular player fancy will be deleted.
        </Typography>
        <Typography variant="body2">
          * 3.5 Test match both advance fancy batsmen run is valid.
        </Typography>

        <Typography variant="h6" mt={2}>
          4 Test partnership:-
        </Typography>
        <Typography variant="body2">
          * 4.1 In partnership one batsman is injured partnership is continued
          in next batsman.
        </Typography>
        <Typography variant="body2">
          * 4.2 Partnership and player runs due to weather condition or match
          abandoned the result will be given as per score.
        </Typography>
        <Typography variant="body2">
          * 4.3 Advance partnership is valid in case both players are different
          or same.
        </Typography>
        <Typography variant="body2">
          * 4.4 Test match both advance fancy partnership is valid.
        </Typography>

        <Typography variant="h6" mt={2}>
          5 Other fancy advance (test):-
        </Typography>
        <Typography variant="body2">
          * 5.1 Four, sixes, wide, wicket, extra run, total run, highest over
          and top batsmen is valid only if 300 overs has been played or the
          match has been won by any team otherwise all these fancy will be
          deleted. Additionally all events are valid only for 1st innings( this
          is applicable to all individual team events also)
        </Typography>

        <Typography variant="h6" mt={2}>
          2 Odi rule:-
        </Typography>
        <Typography variant="body2">
          * Match 1st over run advance fancy only 1st innings run will be
          counted.
        </Typography>
        <Typography variant="body2">
          * Complete session is valid in case due to rain or match abandoned
          particular session will be deleted.And those who are in partnership,
          fall off wicket, and player running, their final result will be given
          on their runs
        </Typography>
        <Typography variant="body2">
          * For example:- 35 over run team a is playing any case team A is
          all-out in 33 over team a has made 150 run the session result is
          validated on particular run.
        </Typography>
        <Typography variant="body2">
          * Advance session is valid in only 1st innings.
        </Typography>
        <Typography variant="body2">
          * In case 50 over is not completed all bet will be deleted due to
          weather or any condition.
        </Typography>
        <Typography variant="body2">
          * Advance 50 over runs is valid in only 1st innings.
        </Typography>

        <Typography variant="h6" mt={2}>
          Odi batsman runs:-
        </Typography>
        <Typography variant="body2">
          * In case batsman is injured he/she is made 34 runs the result will be
          given 34 runs.
        </Typography>
        <Typography variant="body2">
          * In next men out fancy if player is injured particular fancy will be
          deleted.
        </Typography>
        <Typography variant="body2">
          * In advance fancy opening batsmen is only valid if same batsmen came
          in opening the fancy will be valid in case one batsmen is changed that
          particular player fancy will be deleted.
        </Typography>

        <Typography variant="h6" mt={2}>
          Odi partnership runs:-
        </Typography>
        <Typography variant="body2">
          * In partnership one batsman is injured partnership is continued in
          next batsman.
        </Typography>
        <Typography variant="body2">
          * Advance partnership is valid in case both players are different or
          same.
        </Typography>
        <Typography variant="body2">
          * Both team advance partnerships are valid in particular match.
        </Typography>

        <Typography variant="h6" mt={2}>
          Other fancy:-
        </Typography>
        <Typography variant="body2">
          * Four, sixes, wide, wicket, extra run, total run, highest over ,top
          batsman,maiden over,caught-out,no-ball,run-out,fifty and century are
          valid only match has been completed in case due to rain over has been
          reduced all other fancy will be deleted.
        </Typography>

        <Typography variant="h6" mt={2}>
          T20 Session:--
        </Typography>
        <Typography variant="body2">
          * Match 1st over run advance fancy only 1st innings run will be
          counted.
        </Typography>
        <Typography variant="body2">
          * Complete session is valid in case due to rain or match abandoned
          particular session will be deleted.
        </Typography>
        <Typography variant="body2">
          * For example :- 15 over run team a is playing any case team a is
          all-out in 13 over team A has made 100 run the session result is
          validated on particular run.
        </Typography>
        <Typography variant="body2">
          * Advance session is valid in only 1st innings.
        </Typography>
        <Typography variant="body2">
          * Advance 20 over run is valid only in 1st innings. 20 over run will
          not be considered as valid if 20 overs is not completed due to any
          situation
        </Typography>

        <Typography variant="h6" mt={2}>
          T20 batsman runs:-
        </Typography>
        <Typography variant="body2">
          * In case batsman is injured he/she is made 34 runs the result will be
          given 34 runs.
        </Typography>
        <Typography variant="body2">
          * In next men out fancy if player is injured particular fancy will be
          deleted.
        </Typography>
        <Typography variant="body2">
          * In advance fancy opening batsmen is only valid if same batsmen came
          in opening the fancy will be valid in case one batsmen is changed that
          particular player fancy will be deleted.
        </Typography>

        <Typography variant="h6" mt={2}>
          T20 partnership runs:-
        </Typography>
        <Typography variant="body2">
          * In partnership one batsman is injured partnership is continued in
          next batsman.
        </Typography>
        <Typography variant="body2">
          * Advance partnership is valid in case both players are different or
          same.
        </Typography>
        <Typography variant="body2">
          * Both team advance partnerships are valid in particular match.
        </Typography>
        <Typography variant="body2">
          * Advance event is valid in only 1st Innings.
        </Typography>
        <Typography variant="body2">
          * If over reduced due to rain or weather condition or match abandoned
          the result will be given as per score.
        </Typography>

        <Typography variant="h6" mt={2}>
          Other fancy:-
        </Typography>
        <Typography variant="body2">
          * T-20 ,one day and test match in case current innings player and
          partnership are running in between match has been called off or
          abandoned that situation all current player and partnership results
          are valid.
        </Typography>
        <Typography variant="body2">
          * Four, sixes, wide, wicket, extra run, total run, highest over and
          top batsman,maiden over,caught-out,no-ball,run-out,fifty and century
          are valid only match has been completed in case due to rain over has
          been reduced all other fancy will be deleted. 1st 6 over dot ball and
          20 over dot ball fancy only valid is 1st innings.
        </Typography>
        <Typography variant="body2">
          * 1st wicket lost to any team balls meaning that any team 1st wicket
          fall down in how many balls that particular fancy at least minimum one
          ball have to be played otherwise bets will be deleted.
        </Typography>
        <Typography variant="body2">
          * 1st wicket lost to any team fancy valid both innings.
        </Typography>
        <Typography variant="body2">
          * How many balls for 50 runs any team meaning that any team achieved
          50 runs in how many balls that particular fancy at least one ball have
          to be played otherwise that fancy bets will be deleted.
        </Typography>
        <Typography variant="body2">
          * How many balls for 50 runs fancy any team only first inning valid.
        </Typography>
        <Typography variant="body2">
          * 1st 6 inning boundaries runs any team fancy will be counting only
          according to run scored fours and sixes at least 6 over must be played
          otherwise that fancy will be deleted.
        </Typography>
        <Typography variant="body2">
          * 1st inning 6 over boundaries runs any team run like wide ,no-ball
          ,leg-byes ,byes and over throw runs are not counted this fancy.
        </Typography>
        <Typography variant="body2">
          * How many balls face any batsman meaning that any batsman how many
          balls he/she played that particular fancy at least one ball have to be
          played otherwise that fancy bets will be deleted.
        </Typography>
        <Typography variant="body2">
          * How many balls face by any batsman both innings valid.
        </Typography>
        <Typography variant="body2">
          * Lowest scoring over will be considered valid only if the over is
          completed fully (all six deliveries has to be bowled)
        </Typography>

        <Typography variant="h6" mt={2}>
          Concussion in Test:-
        </Typography>
        <Typography variant="body2">
          * All bets of one over session will be deleted in test scenario, in
          case session is incomplete. For example innings declared or match
          suspended to bad light or any other conditions.
        </Typography>
        <Typography variant="body2">
          * 1. All bets will be considered as valid if a player has been
          replaced under concussion substitute, result will be given for the
          runs scored by the mentioned player. For example DM Bravo gets retired
          hurt at 23 runs, then result will be given for 23.
        </Typography>
        <Typography variant="body2">
          * 2. Bets of both the player will be valid under concussion
          substitute.
        </Typography>

        <Typography variant="h6" mt={2}>
          Total Match- Events (test):-
        </Typography>
        <Typography variant="body2">
          * Minimum of 300 overs to be bowled in the entire test match,
          otherwise all bets related to the particular event will get void. For
          example, Total match caught outs will be valid only if 300 overs been
          bowled in the particular test match
        </Typography>

        <Typography variant="h6" mt={2}>
          Limited over events-Test:-
        </Typography>
        <Typography variant="body2">
          * This event will be considered valid only if the number of overs
          defined on the particular event has been bowled, otherwise all bets
          related to this event will get void. For example 0-25 over events will
          be valid only if 25 overs has been bowled, else the same will not be
          considered as valid
        </Typography>
        <Typography variant="body2">
          * If the team gets all out prior to any of the defined overs, then
          balance overs will be counted in next innings. For example if the team
          gets all out in 23.1 over the same will be considered as 24 overs and
          the balance overs will be counted from next innings.
        </Typography>

        <Typography variant="h6" mt={2}>
          Bowler Wicket event's- Test:-
        </Typography>
        <Typography variant="body2">
          * Minimum of one legal over (one complete over) has to be bowled by
          the bowler mentioned in the event, else the same will not be
          considered as valid
        </Typography>

        <Typography variant="h6" mt={2}>
          Bowler over events- Test:-
        </Typography>
        <Typography variant="body2">
          * The mentioned bowler has to complete the defined number of overs,
          else the bets related to that particular event will get void. For
          example if the mentioned bowler has bowled 8 overs, then 5 over run of
          that particular bowler will be considered as valid and the 10 over run
          will get void
        </Typography>

        <Typography variant="h6" mt={2}>
          Player ball event's- Test:-
        </Typography>
        <Typography variant="body2">
          * This event will be considered valid only if the defined number of
          runs made by the mentioned player, else the result will be considered
          as 0 (zero) balls
        </Typography>
        <Typography variant="body2">
          * For example if Root makes 20 runs in 60 balls and gets out on 22
          runs, result for 20 runs will be 60 balls and the result for balls
          required for 25 run Root will be considered as 0 (Zero) and the same
          will be given as result
        </Typography>

        <Typography variant="h6" mt={2}>
          Limited over events-ODI:-
        </Typography>
        <Typography variant="body2">
          * This event will be considered valid only if the number of overs
          defined on the particular event has been bowled, otherwise all bets
          related to this event will get void. 0-50 over events will be valid
          only if 50 over completed, if the team batting first get all out prior
          to 50 over the balance over will be counted from second innings. For
          example if team batting first gets all out in 35 over balance 15 over
          will be counted from second innings, the same applies for all events
          if team gets all out before the defined number of overs
        </Typography>
        <Typography variant="body2">
          * The events which remains incomplete will be voided if over gets
          reduced in the match due to any situation, for example if match
          interrupted in 15 overs due to rain/badlight and post this over gets
          reduced. Events for 0-10 will be valid, all other events related to
          this type will get deleted.
        </Typography>
        <Typography variant="body2">
          * This events will be valid only if the defined number of over is
          completed. For example team batting first gets all out in 29.4 over
          then the same will be considered as 30 over, the team batting second
          must complete 20 overs only then 0-50 over events will be considered
          as valid. In case team batting second gets all out in 19.4 over then
          0-50 over event will not be considered as valid, This same is valid
          for 1st Innings only.
        </Typography>

        <Typography variant="h6" mt={2}>
          Bowler event- ODI:-
        </Typography>
        <Typography variant="body2">
          * The mentioned bowler has to complete the defined number of overs,
          else the bets related to that particular event will get void. For
          example if the mentioned bowler has bowled 8 overs, then 5 over run of
          that particular bowler will be considered as valid and the 10 over run
          will get void
        </Typography>
        <Typography variant="body2">* Both innings are valid</Typography>

        <Typography variant="h6" mt={2}>
          Other event:- T20
        </Typography>
        <Typography variant="body2">
          * The events for 1-10 over and 11-20 over will be considered valid
          only if the number of over mentioned has been played completely.
          However if the over got reduced before the particular event then the
          same will be voided, if the team batting first get all out prior to 20
          over the balance over will be counted from second innings. For example
          if team batting first gets all out in 17 over balance 3 over will be
          counted from second innings and that 3 over all events are counted.
          This same is valid for 1st Innings only.
        </Typography>
        <Typography variant="body2">
          * If over got reduced in between any running event, then the same will
          be considered valid and the rest will be voided. For example.., match
          started and due to rain/bad light or any other situation match got
          interrupted at 4 over and later over got reduced. Then events for 1-10
          is valid rest all will be voided
        </Typography>
        <Typography variant="body2">
          * Bowler Session: Bowler session advance events only valid for 1st
          inning. This event is valid only if the bowler has completed his
          maximum quota of overs, else the same will be voided. However if the
          match has resulted and the particular bowler has already started
          bowling his final over then result will be given even if he haven't
          completed the over. For example B Kumar is bowling his final over and
          at 3.4 the match has resulted then result will be given for B Kumar
          over runs
        </Typography>
        <Typography variant="body2">
          * Incase of DLS, the over got reduced then the bowler who has already
          bowled his maximum quota of over that result will be considered as
          valid and the rest will be voided
        </Typography>

        <Typography variant="h6" mt={2}>
          Dot ball Event:
        </Typography>
        <Typography variant="body2">
          * Only No run will count as dot ball.
        </Typography>
        <Typography variant="body2">
          * If wicket means that will not count as dot ball.
        </Typography>
        <Typography variant="body2">* Both innings are valid</Typography>
        <Typography variant="body2">
          * Boundary hit on Free hit only be considered as valid
        </Typography>
        <Typography variant="body2">
          * Bets will be deleted if there is no Free hit in the mentioned match
        </Typography>
        <Typography variant="body2">
          * Boundary by bat will be considered as valid
        </Typography>
        <Typography variant="body2">* Boundaries by Player</Typography>
        <Typography variant="body2">* Both Four and six are valid</Typography>
        <Typography variant="body2">* No Boundaries Event:</Typography>
        <Typography variant="body2">* Both Four and Six are valid</Typography>
        <Typography variant="body2">
          * Batsman bat boundaries only considered as valid
        </Typography>
        <Typography variant="body2">
          * Free hit boundaries also valid
        </Typography>
        <Typography variant="body2">
          * Bets will be voided if that particular ball not completed
        </Typography>
        <Typography variant="body2">
          * Result will be Given 0 or 4 (No or Yes). For Example batsman hit
          boundary in particular ball means Result is 0 otherwise Result is 4.
        </Typography>

        <Typography variant="h6" mt={2}>
          * Power Surge Rule in Big Bash
        </Typography>
        <Typography variant="body2">
          * Power Play First Four Overs + Power Surge Two Overs-Batters Choice
        </Typography>
        <Typography variant="body2">
          * There’s still a four-over power play at the start of the innings,
          but now the batting team can take the other two Power Surge overs any
          time from the 11th over onwards.
        </Typography>
        <Typography variant="body2">
          * Any query regarding result or rate has to be contacted within 4 days
          from the event, query after 4 days from the event will not be
          considered as valid
        </Typography>
      </div>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        sx={{
          '& .MuiPaper-root': {
            backgroundColor: '#fff',
            color: '#000',
          },
        }}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">31XBET Games Rules</Typography>
            <IconButton onClick={handleClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            प्रिय ग्राहक,<br />
            किसी भी इवेंट या खेल का परिणाम गलती से दर्ज होने पर, उसे सही करने का अधिकार हमेशा रहेगा। परिणाम दर्ज होने के बाद से 48 से 72 घंटों के अंदर या कभी भी उस खेल या इवेंट का सही परिणाम दर्ज किया जा सकता है।<br />
            यदि ग्राहक घोषित ग़लत रिजल्ट के द्वारा बड़े हुये कॉइन का यूज़ करता है तो रिजल्ट सही किए जाने पर इस्तेमाल किए गए कॉइन का भुगतान ग्राहक को ख़ुद करना पड़ेगा, या ग्राहक की आईडी से कॉइन माइनस या काट लिए जाएँगे यदि ग्राहक इन शर्तों से सहमत होता है, तो ही वह इस साइट पर बैटिंग कर सकता है।<br />
            इस स्थिति में बाद में किसी भी प्रकार का विवाद न तो एजेंट के साथ और न ही एजेंट के द्वारा कंपनी के साथ स्वीकार किया जाएगा। यदि एजेंट ने इन शर्तों को पहले ही अपने ग्राहक को बता दे , बाद में किसी भी प्रकार का तर्क या विवाद स्वीकार नहीं किया जाएगा।
          </Typography>
          <Typography variant="body2" mt={2}>
            Dear Client,<br />
            If any event or game is entered in error, the user shall always have the right to correct it. The correct result for the game or event may be entered within 48 to 72 hours after the result has been entered or at any time.<br />
            If the Client uses the coins added by a wrong result declared, then the Client will have to pay for the coins used when the result is corrected, or the coins will be minused or deducted from the Client's ID. The Client can bet on this site only if he agrees to these terms.<br />
            In this case, no dispute of any kind will be entertained later either with the Agent or by the Agent with the Company. If the Agent has already informed these conditions to its Client, no argument or dispute of any kind will be entertained later.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} variant="contained" className="main-menu-btn">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Rules;