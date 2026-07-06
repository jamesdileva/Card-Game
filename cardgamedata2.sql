--
-- PostgreSQL database dump
--

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

-- Started on 2026-04-06 23:04:15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 5048 (class 0 OID 16413)
-- Dependencies: 224
-- Data for Name: deck; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.deck (id, user_id, slot, card_id) VALUES
(736, 8, 0, NULL),
(737, 8, 1, NULL),
(738, 8, 2, NULL),
(445, 4, 0, 'wild_symbol'),
(446, 4, 1, 'reroll'),
(447, 4, 2, 'reroll'),
(1021, 9, 0, NULL),
(1022, 9, 1, NULL),
(1023, 9, 2, NULL),
(1, 1, 0, 'mythic_multiplier'),
(2, 1, 1, 'double_down'),
(3, 1, 2, 'double_down'),
(691, 7, 0, NULL),
(692, 7, 1, NULL),
(693, 7, 2, NULL),
(1024, 10, 0, 'reroll'),
(1025, 10, 1, 'mythic_multiplier'),
(1026, 10, 2, 'mythic_multiplier'),
(1042, 11, 0, 'double_down'),
(1043, 11, 1, 'multiplier_chain'),
(1044, 11, 2, NULL),
(418, 3, 0, 'mythic_multiplier'),
(419, 3, 1, NULL),
(420, 3, 2, NULL),
(1312, 12, 0, 'lucky_charm'),
(1313, 12, 1, 'reroll'),
(1314, 12, 2, NULL);



--
-- TOC entry 5046 (class 0 OID 16403)
-- Dependencies: 222
-- Data for Name: inventory; Type: TABLE DATA; Schema: public; Owner: postgres
--
INSERT INTO public.inventory (id, user_id, card_id, rarity) VALUES
(263,1,'mythic_multiplier','legendary'),
(264,1,'mythic_multiplier','legendary'),
(265,1,'mythic_multiplier','legendary'),
(266,1,'reroll','common'),
(267,1,'reroll','common'),
(268,1,'double_down','rare'),
(269,1,'multiplier_chain','epic'),
(270,1,'wild_symbol','epic'),
(271,1,'mythic_multiplier','legendary'),
(272,1,'mythic_multiplier','legendary'),
(273,1,'mythic_multiplier','legendary'),
(274,1,'mythic_multiplier','legendary'),
(275,1,'mythic_multiplier','legendary'),
(276,1,'double_down','rare'),
(277,1,'reroll','common'),
(278,1,'lucky_charm','common'),
(279,1,'reroll','common'),
(280,1,'wild_symbol','epic'),
(281,1,'multiplier_chain','epic'),
(282,4,'mythic_multiplier','legendary'),
(283,4,'multiplier_chain','epic'),
(284,4,'reroll','common'),
(285,4,'reroll','common'),
(286,4,'lucky_charm','common'),
(287,4,'wild_symbol','epic'),
(288,1,'reroll','common'),
(289,1,'jackpot_boost','rare'),
(290,1,'wild_symbol','epic'),
(291,1,'mythic_multiplier','legendary'),
(292,1,'multiplier_chain','epic'),
(293,1,'wild_symbol','epic'),
(294,1,'multiplier_chain','epic'),
(295,1,'wild_symbol','epic'),
(296,1,'mythic_multiplier','legendary'),
(297,1,'wild_symbol','epic'),
(298,1,'double_down','rare'),
(299,1,'mythic_multiplier','legendary'),
(300,1,'reroll','common'),
(301,1,'jackpot_boost','rare'),
(302,1,'double_down','rare'),
(303,1,'double_down','rare'),
(304,1,'lucky_charm','common'),
(305,1,'double_down','rare'),
(306,1,'mythic_multiplier','legendary'),
(307,1,'multiplier_chain','epic'),
(308,8,'lucky_charm','common'),
(309,8,'double_down','rare'),
(310,8,'double_down','rare'),
(311,8,'lucky_charm','common'),
(312,8,'jackpot_boost','rare'),
(313,8,'jackpot_boost','rare'),
(314,9,'lucky_charm','common'),
(315,9,'reroll','common'),
(316,9,'wild_symbol','epic'),
(317,9,'reroll','common'),
(318,9,'reroll','common'),
(319,9,'lucky_charm','common'),
(320,10,'lucky_charm','common'),
(321,10,'reroll','common'),
(322,10,'mythic_multiplier','legendary'),
(323,10,'mythic_multiplier','legendary'),
(324,10,'lucky_charm','common'),
(325,10,'lucky_charm','common'),
(326,11,'double_down','rare'),
(327,11,'multiplier_chain','epic'),
(328,1,'wild_symbol','epic'),
(329,1,'multiplier_chain','epic'),
(330,12,'lucky_charm','common'),
(331,12,'reroll','common'),
(262,3,'mythic_multiplier','legendary');


--
-- TOC entry 5049 (class 0 OID 16422)
-- Dependencies: 225
-- Data for Name: session; Type: TABLE DATA; Schema: public; Owner: postgres
--


--
-- TOC entry 5044 (class 0 OID 16390)
-- Dependencies: 220
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--
INSERT INTO public.users 
(id, username, password, balance, xp, level, payout_boost, xp_boost, win_streak, last_login, login_streak, last_rewarded_level, claimed_level_rewards, inventory)
VALUES
(9,'james99','$2b$10$5fiJHxueQfIUwjCLL3oowefxCO5hJc3YRTFO50.ZyzZjUrZXWGDi.',50,5,2,1,1,0,'2026-04-06',1,2,'{}','[]'),
(8,'james553','$2b$10$XgC3MF4ypc6e.UkuKddBg.PIghCB2XQmnodNSL736jxNWiS5Ds/Va',300,10,1,1,1,0,'2026-04-06',1,1,'{}','[]'),
(11,'james1122','$2b$10$RvQOLinPnaY5LY2/wyPNIudrV0HlS5NaUpc.K4RaW/ZAizwao7J8i',40,60,1,1,1,0,'2026-04-06',1,1,'{}','[]'),
(4,'james3','$2b$10$04j4EUhs5gYP1gQLVjU8TuD29dUWy7xzXylQ655p51GV0/RlQP6Bm',7240,120,4,1,1,1,'2026-04-05',1,4,'{}','[]'),
(3,'james2','$2b$10$dNYPtjYa7lEowRkPRvOSt.B7ioZUDU20gQReO99KnVW.RwQ4Q2u/2',2350,30,1,1,1,2,'2026-04-05',1,1,'{}','[]'),
(7,'james55','$2b$10$Ta1NUykbbRiygoP0dHai4.IcfdovAikrg4rZi.ZWZ2oO9BnKuLLkO',1100,0,1,1,1,0,'2026-04-05',1,0,'{}','[]'),
(12,'james222','$2b$10$tjai4P7mrI7O4Ez70ueq3OQb1ohlr9xgSlN0EnYLex1nuBB5Bu7Yy',550,95,1,1,1,0,'2026-04-07',1,1,'{}','[]'),
(1,'james','$2b$10$RiBtlzkDltFAWkw9PUepNOBKrS5nM/FIOewaq/TY5UhBZhMOejtBq',15106533,8396,167,4.1,34,1,'2026-04-07',2,167,'{}','[]'),
(10,'james1111','$2b$10$..t1aoO2yVRCNKYPLjDe/.QXtaff821k4rrhHhvEaAsckahvya5o2',0,85,2,1,1,0,'2026-04-06',1,2,'{}','[]');

--
-- TOC entry 5058 (class 0 OID 0)
-- Dependencies: 223
-- Name: deck_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.deck_id_seq', 1539, true);


--
-- TOC entry 5059 (class 0 OID 0)
-- Dependencies: 221
-- Name: inventory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.inventory_id_seq', 331, true);


--
-- TOC entry 5060 (class 0 OID 0)
-- Dependencies: 219
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 12, true);


-- Completed on 2026-04-06 23:04:15

--
-- PostgreSQL database dump complete
--
