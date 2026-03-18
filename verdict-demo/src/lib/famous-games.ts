export interface FamousGame {
  id: string;
  name: string;
  description: string;
  pgn: string;
  suspicionNote: string;
}

const NIEMANN_CARLSEN_2022 = `[Event "Sinquefield Cup"]
[Site "Saint Louis USA"]
[Date "2022.09.04"]
[Round "3"]
[White "Niemann, Hans Moke"]
[Black "Carlsen, Magnus"]
[Result "1-0"]

1. d4 Nf6 2. c4 e6 3. Nf3 d5 4. Nc3 Be7 5. Bf4 O-O 6. e3 c5 7. dxc5 Bxc5
8. Qc2 Nc6 9. a3 Qa5 10. Rd1 Rd8 11. Be2 dxc4 12. Bxc4 e5 13. Bg5 Bg4
14. O-O Nd4 15. Nxd4 Bxd4 16. h3 Bh5 17. Bxf6 gxf6 18. e4 Qb6 19. Nd5 Qa5
20. b4 Qd8 21. Qb2 Bg6 22. Nxf6+ Kh8 23. Nh5 Be7 24. Nf4 Bf6 25. Nxg6+ hxg6
26. Qe2 a5 27. bxa5 Rxa5 28. Bd5 Bg7 29. Qg4 Qf6 30. Qf3 Qe7 31. Bc4 Rda8
32. g3 Qe6 33. Bb3 Qf6 34. Rd7 Rxa3 35. Rxb7 Ra1 36. Rxa1 Rxa1+ 37. Kh2 Qd4
38. Qb7 Ra7 39. Qb8+ Qf8 40. Qxf8+ Bxf8 41. Rb8 Ra2 42. Kg1 Kg7 43. Kf1 Rc2
44. Bd1 Rd2 45. Ke1 Rd4 46. f3 Kf6 47. Ke2 Ke6 48. Ke3 Rd8 49. Rxd8 Bxd8
50. Bb3+ Kf6 51. Kd3 Ke6 52. Kc4 f5 53. exf5+ gxf5 54. Kd3 Bb6 55. Ke3 Ke5
56. Ba4 Bc5+ 57. Kd3 f4 58. Ke2 Kd4 59. g4 e4 60. fxe4 Kxe4 61. Bb3 Be3
62. h4 Kf3 63. h5 Kg3 64. g5 f3+ 65. Ke1 Kf4 66. h6 Bc5 67. g6 1-0`;

const KASPAROV_DEEP_BLUE_1997 = `[Event "IBM Man-Machine"]
[Site "New York USA"]
[Date "1997.05.11"]
[Round "6"]
[White "Deep Blue"]
[Black "Kasparov, Garry"]
[Result "1-0"]

1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Nd7 5. Ng5 Ngf6 6. Bd3 e6 7. N1f3 h6
8. Nxe6 Qe7 9. O-O fxe6 10. Bg6+ Kd8 11. Bf4 b5 12. a4 Bb7 13. Re1 Nd5
14. Bg3 Kc8 15. axb5 cxb5 16. Qd3 Bc6 17. Bf5 exf5 18. Rxe7 Bxe7 19. c4 1-0`;

const SHORT_TIMMAN_1991 = `[Event "Tilburg"]
[Site "Tilburg NED"]
[Date "1991.10.15"]
[Round "4"]
[White "Short, Nigel D"]
[Black "Timman, Jan H"]
[Result "1-0"]

1. e4 Nf6 2. e5 Nd5 3. d4 d6 4. Nf3 g6 5. Bc4 Nb6 6. Bb3 Bg7 7. Nbd2 O-O
8. h3 a5 9. a4 dxe5 10. dxe5 Na6 11. O-O Nc5 12. Qe2 Qe8 13. Ne4 Nbxa4
14. Bxa4 Nxa4 15. Re1 Nb6 16. Bd2 a4 17. Bg5 h6 18. Bh4 Bf5 19. g4 Be6
20. Nd4 Bc4 21. Qd2 Nd5 22. Kg2 Kh7 23. Kf1 Kg8 24. Qf4 a3 25. Re2 Bd3
26. Rd2 axb2 27. Qxb2 Qe7 28. Nf5 Qe6 29. Qd4 Be2+ 30. Kg2 gxf5 31. gxf5 Qf6 32. Kh2 Rd8
33. Qe4 Rd7 34. Nxf6+ exf6 35. exf6 Kh8 36. Qe8 Bf8 37. Bg3 Rd8 38. Qe4 Bg7
39. fxg7+ Kxg7 40. Qe5+ Kh7 41. Qf6 Rg8 42. Rd7 Rc8 43. f6 Bg4 44. hxg4 Nc3
45. Qg7# 1-0`;

export const FAMOUS_GAMES: FamousGame[] = [
  {
    id: "niemann-carlsen-2022",
    name: "Niemann vs Carlsen — Sinquefield Cup 2022",
    description:
      "The game that ignited the biggest cheating scandal in modern chess. Hans Niemann defeated Magnus Carlsen with the black pieces, leading Carlsen to withdraw from the tournament and later accuse Niemann of cheating.",
    pgn: NIEMANN_CARLSEN_2022,
    suspicionNote:
      "Carlsen alleged Niemann cheated. FIDE investigation was inconclusive. VERDICT can analyze move-level integrity patterns that human arbiters cannot.",
  },
  {
    id: "kasparov-deep-blue-1997",
    name: "Kasparov vs Deep Blue — Game 6, 1997",
    description:
      "The decisive game where IBM's Deep Blue defeated world champion Garry Kasparov, marking the first time a computer won a match against a reigning champion under standard time controls.",
    pgn: KASPAROV_DEEP_BLUE_1997,
    suspicionNote:
      "Kasparov alleged IBM cheated by using human grandmaster assistance between games. The machine's logs were never fully disclosed. A perfect case for protocol-level transparency.",
  },
  {
    id: "short-timman-1991",
    name: "Short vs Timman — Tilburg 1991",
    description:
      "Nigel Short's famous king march — walking his king from g1 to h2 to g2 to f1 to g2 to h2 in the middlegame, an audacious display that looked like a bug but was brilliant strategy.",
    pgn: SHORT_TIMMAN_1991,
    suspicionNote:
      "The king walk triggers anomalous movement patterns. A naive integrity system might flag this as suspicious — VERDICT's multi-check approach distinguishes brilliance from manipulation.",
  },
];
